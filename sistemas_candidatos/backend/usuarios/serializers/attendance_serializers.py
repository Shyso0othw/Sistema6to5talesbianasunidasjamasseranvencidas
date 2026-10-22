from rest_framework import serializers
from django.db.models import Q, Sum, F
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone
from usuarios.models import *

class AsistenciaSerializer(serializers.ModelSerializer):
    materia_nombre = serializers.CharField(source='materia.nombre', read_only=True)
    estudiante_nombre = serializers.SerializerMethodField()
    porcentaje = serializers.IntegerField(read_only=True)

    class Meta:
        model = Asistencia
        fields = '__all__'
        read_only_fields = ['id']

    def get_estudiante_nombre(self, obj):
        return f"{obj.estudiante.apellido}, {obj.estudiante.nombre}"

    def validate(self, data):
        for field in ('presentes','ausentes','justificadas','injustificadas','tardes','total'):
            if data.get(field,0) < 0:
                raise serializers.ValidationError({field: 'No puede ser negativo.'})
        return data

class AsistenciaPersonalSerializer(serializers.ModelSerializer):
    class Meta:
        model = AsistenciaPersonal
        fields = '__all__'
        read_only_fields = ['id', 'fecha']

    def to_internal_value(self, data):
        data = data.copy()
        aliases = {'Docente':'Profesor','Directivo':'Director','Secretaría':'Secretaria'}
        if data.get('cargo') in aliases:
            data['cargo'] = aliases[data['cargo']]
        if data.get('hora_salida') == '':
            data['hora_salida'] = None
        return super().to_internal_value(data)

class AsistenciaDiariaSerializer(serializers.ModelSerializer):
    estudiante_nombre = serializers.SerializerMethodField()

    class Meta:
        model = AsistenciaDiaria
        fields = '__all__'

    def get_estudiante_nombre(self, obj):
        return f"{obj.estudiante.apellido}, {obj.estudiante.nombre}"

