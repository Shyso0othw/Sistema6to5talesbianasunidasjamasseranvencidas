from rest_framework import serializers
from django.db.models import Q, Sum, F
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db import transaction
from usuarios.models import *

ACTIVE_LOANS = {'Al dia', 'En posesion', 'Demorado'}

class LibroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Libro
        fields = '__all__'

    def validate(self, data):
        copies = data.get('copias', getattr(self.instance, 'copias', 1))
        available = data.get('disponibles', getattr(self.instance, 'disponibles', copies))
        if copies < 0 or available < 0 or available > copies:
            raise serializers.ValidationError('Las existencias deben cumplir 0 ≤ disponibles ≤ copias.')
        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        book = Libro.objects.select_for_update().get(pk=instance.pk)
        copies = validated_data.get('copias', book.copias)
        available = validated_data.get('disponibles', book.disponibles)
        active = book.prestamos.filter(estado__in=ACTIVE_LOANS).count()
        if not 0 <= available <= copies - active:
            raise serializers.ValidationError('Las existencias deben reservar las copias de los préstamos activos.')
        return super().update(book, validated_data)

class PrestamoSerializer(serializers.ModelSerializer):
    libro_titulo = serializers.SerializerMethodField()
    usuario_nombre = serializers.SerializerMethodField()
    solicitante_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Prestamo
        fields = '__all__'
        read_only_fields = ['id']

    def get_libro_titulo(self, obj):
        return obj.libro.titulo if obj.libro else None

    def validate(self, data):
        start = data.get('fecha_prestamo', getattr(self.instance, 'fecha_prestamo', None))
        end = data.get('fecha_entrega', getattr(self.instance, 'fecha_entrega', None))
        if start and end and end < start:
            raise serializers.ValidationError({'fecha_entrega': 'No puede ser anterior al préstamo.'})
        if self.instance:
            for field in ('libro', 'usuario'):
                if field in data and data[field].pk != getattr(self.instance, f'{field}_id'):
                    raise serializers.ValidationError({field: 'No puede cambiarse en un préstamo existente.'})
        return data

    @transaction.atomic
    def create(self, validated_data):
        book = Libro.objects.select_for_update().get(pk=validated_data['libro'].pk)
        state = validated_data.get('estado', 'Pendiente')
        if state in ACTIVE_LOANS:
            if book.disponibles < 1:
                raise serializers.ValidationError('No hay copias disponibles.')
            book.disponibles -= 1
            book.save(update_fields=['disponibles'])
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        instance = Prestamo.objects.select_for_update().get(pk=instance.pk)
        book = Libro.objects.select_for_update().get(pk=instance.libro_id)
        old = instance.estado
        new = validated_data.get('estado', old)
        allowed = ({'Pendiente','Solicitado','Rechazado'} | ACTIVE_LOANS if old in {'Pendiente','Solicitado'}
                   else ACTIVE_LOANS | {'Devuelto'} if old in ACTIVE_LOANS else {old})
        if new not in allowed:
            raise serializers.ValidationError({'estado':'Transición de estado no permitida.'})
        difference = int(old in ACTIVE_LOANS) - int(new in ACTIVE_LOANS)
        if not 0 <= book.disponibles + difference <= book.copias:
            raise serializers.ValidationError('No hay existencias suficientes o el inventario es inconsistente.')
        if difference:
            book.disponibles += difference
            book.save(update_fields=['disponibles'])
        return super().update(instance, validated_data)

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return obj.usuario.get_full_name() or obj.usuario.username
        return None

    def get_solicitante_nombre(self, obj):
        if obj.solicitante:
            return obj.solicitante.get_full_name() or obj.solicitante.username
        return None

