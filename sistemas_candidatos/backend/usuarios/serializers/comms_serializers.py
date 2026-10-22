from rest_framework import serializers
from django.db.models import Q, Sum, F
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone
from usuarios.models import *
from .auth_serializers import UsuarioSimpleSerializer

class MensajeSerializer(serializers.ModelSerializer):
    grupo_id = serializers.IntegerField(read_only=True)
    grupo_nombre = serializers.CharField(source='grupo.nombre', read_only=True, allow_null=True)
    remitente_username = serializers.CharField(source='remitente.username', read_only=True)
    remitente_nombre = serializers.SerializerMethodField()
    destinatario_username = serializers.CharField(source='destinatario.username', read_only=True, allow_null=True)
    destinatario_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = Mensaje
        fields = [
            'id',
            'remitente',
            'remitente_username',
            'remitente_nombre',
            'destinatario',
            'destinatario_username',
            'destinatario_nombre',
            'grupo', 'grupo_id', 'grupo_nombre',
            'contenido',
            'leido',
            'fecha_creacion',
        ]
        read_only_fields = ['id', 'leido', 'remitente', 'fecha_creacion', 'remitente_username', 'remitente_nombre', 'destinatario_username', 'destinatario_nombre']
    
    def get_remitente_nombre(self, obj):
        return obj.remitente.get_full_name() or obj.remitente.username
    
    def get_destinatario_nombre(self, obj):
        if obj.destinatario:
            return obj.destinatario.get_full_name() or obj.destinatario.username
        return None

class GrupoChatSerializer(serializers.ModelSerializer):
    miembros_detalle = UsuarioSimpleSerializer(source='miembros', many=True, read_only=True)
    creador_nombre = serializers.SerializerMethodField()
    ultimo_mensaje = serializers.SerializerMethodField()

    class Meta:
        model = GrupoChat
        fields = ['id', 'nombre', 'creador', 'creador_nombre', 'miembros', 'miembros_detalle', 'ultimo_mensaje', 'fecha_creacion']
        read_only_fields = ['id', 'creador', 'fecha_creacion']

    def get_creador_nombre(self, obj):
        return obj.creador.get_full_name() or obj.creador.username

    def get_ultimo_mensaje(self, obj):
        ultimo = obj.mensajes.order_by('-fecha_creacion').first()
        if not ultimo:
            return None
        return {
            'contenido': ultimo.contenido,
            'fecha_creacion': ultimo.fecha_creacion.isoformat(),
            'remitente_id': ultimo.remitente_id,
            'remitente_nombre': ultimo.remitente.get_full_name() or ultimo.remitente.username,
        }

class EventoSerializer(serializers.ModelSerializer):
    hora_inicio = serializers.TimeField(required=False, allow_null=True)
    hora_fin = serializers.TimeField(required=False, allow_null=True)
    lugar = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    ciclo = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    curso = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    descripcion = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Evento
        fields = [
            'id',
            'titulo',
            'descripcion',
            'fecha',
            'hora_inicio',
            'hora_fin',
            'lugar',
            'ciclo',
            'curso',
            'tipo',
            'creado_por',
        ]
        read_only_fields = ['id', 'tipo', 'creado_por']

    def to_internal_value(self, data):
        data = data.copy()
        optional_fields = ['hora_inicio', 'hora_fin', 'lugar', 'ciclo', 'curso']
        for field in optional_fields:
            if field in data and (data[field] == "" or data[field] is None):
                data[field] = None
        return super().to_internal_value(data)

    def validate(self, data):
        from usuarios.audience import validate_audience
        validate_audience(data, self.instance)
        inicio = data.get('hora_inicio', getattr(self.instance, 'hora_inicio', None))
        fin = data.get('hora_fin', getattr(self.instance, 'hora_fin', None))
        if inicio and fin and fin <= inicio:
            raise serializers.ValidationError({'hora_fin': 'Debe ser posterior al inicio.'})
        return data

class ComunicadoSerializer(serializers.ModelSerializer):
    creado_por_nombre = serializers.SerializerMethodField()
    rol_creador = serializers.SerializerMethodField()

    class Meta:
        model = Comunicado
        fields = [
            'id', 
            'titulo', 
            'cuerpo', 
            'fecha', 
            'fecha_publicacion', 
            'creado_por', 
            'creado_por_nombre', 
            'rol_creador',
            'tipo_destinatario', 
            'cursos_seleccionados'
        ]
        read_only_fields = ['id', 'fecha', 'creado_por', 'creado_por_nombre', 'rol_creador']

    def get_creado_por_nombre(self, obj):
        return obj.creado_por.get_full_name() or obj.creado_por.username
    
    def get_rol_creador(self, obj):
        try:
            return obj.creado_por.perfil.rol.nombre
        except Exception:
            return 'desconocido'

    def validate(self, data):
        from usuarios.audience import validate_audience
        validate_audience(data, self.instance)
        if data.get('hora_inicio') and data.get('hora_fin') and data['hora_fin'] <= data['hora_inicio']:
            raise serializers.ValidationError({'hora_fin': 'Debe ser posterior al inicio.'})
        return data

