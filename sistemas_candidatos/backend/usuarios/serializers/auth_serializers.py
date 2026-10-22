from rest_framework import serializers
from django.db.models import Q, Sum, F
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone
from usuarios.models import *
from .people_serializers import AlumnoSerializer, DocenteSerializer, PreceptorSerializer, FamiliaSerializer, PersonalStaffSerializer

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

class UsuarioSimpleSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listar usuarios para chat"""
    nombre_completo = serializers.SerializerMethodField()
    ultimo_mensaje = serializers.SerializerMethodField()
    rol = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'nombre_completo', 'ultimo_mensaje', 'rol']
    
    def get_nombre_completo(self, obj):
        return obj.get_full_name() or obj.username
        
    def get_rol(self, obj):
        try:
            return obj.perfil.rol.nombre
        except Exception:
            return ''
    
    def get_ultimo_mensaje(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        user = request.user
        ultimo = Mensaje.objects.filter(
            Q(remitente=user, destinatario=obj) | Q(remitente=obj, destinatario=user)
        ).order_by('-fecha_creacion').first()
        if not ultimo:
            return None
        return {
            'contenido': ultimo.contenido,
            'fecha_creacion': ultimo.fecha_creacion.isoformat(),
            'remitente_id': ultimo.remitente_id,
        }

class PerfilUsuarioSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    rol_principal = serializers.SerializerMethodField()
    perfil_especifico = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'nombre_completo', 'rol_principal', 'roles', 'perfil_especifico',
        ]

    def get_nombre_completo(self, obj):
        return obj.get_full_name() or obj.username

    def get_rol_principal(self, obj):
        try:
            return obj.perfil.rol.nombre
        except Exception:
            return 'sin_rol'

    def get_roles(self, obj):
        try:
            return obj.perfil.get_all_roles()
        except Exception:
            return ['sin_rol']

    def get_perfil_especifico(self, obj):
        try:
            perfil = obj.perfil
            rol = perfil.rol.nombre
        except Exception:
            return None

        if rol == 'estudiante':
            try:
                alumno = obj.alumno
                return AlumnoSerializer(alumno).data
            except Exception:
                return None
        elif rol in ('profesor', 'jefe_area', 'jefe_departamento'):
            try:
                docente = obj.docente
                return DocenteSerializer(docente).data
            except Exception:
                return None
        elif rol in ('preceptor', 'jefe_preceptores'):
            try:
                preceptor = obj.preceptor
                return PreceptorSerializer(preceptor).data
            except Exception:
                return None
        elif rol == 'familia':
            try:
                familia = obj.familia
                return FamiliaSerializer(familia).data
            except Exception:
                return None
        elif rol in ('directivo', 'secretaria', 'eoe', 'ematp', 'auxiliar', 'bibliotecario', 'director', 'secretario'):
            try:
                staff = obj.personal_staff
                return PersonalStaffSerializer(staff).data
            except Exception:
                return None

        return None

class CrearUsuarioSimpleSerializer(serializers.Serializer):
    nombre = serializers.CharField()
    apellido = serializers.CharField()
    dni = serializers.CharField(min_length=7, max_length=9)
    telefono = serializers.CharField(max_length=53, trim_whitespace=False, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    fecha_nacimiento = serializers.DateField(required=False)
    año = serializers.IntegerField(required=False, min_value=1, max_value=7)
    division = serializers.CharField(required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    rol = serializers.CharField()

    def validate_rol(self, value):
        from usuarios.account_policy import validate_assigned_role
        return validate_assigned_role(self.context['request'].user, value)

    def validate_dni(self, value):
        digits = value.replace('.', '')
        if User.objects.filter(username=digits).exists():
            raise serializers.ValidationError('El DNI ya está registrado como usuario')
        return digits

    def save(self):
        data = self.validated_data
        user = User.objects.create_user(
            username=data['dni'],
            password=data['password'],
            first_name=data['nombre'],
            last_name=data['apellido']
        )
        if data.get('email'):
            user.email = data['email']
            user.save(update_fields=['email'])
        rol, _ = Rol.objects.get_or_create(nombre=data['rol'])
        Perfil.objects.create(user=user, rol=rol)
        if data['rol'] == 'estudiante':
            Alumno.objects.create(user=user, nombre=data['nombre'], apellido=data['apellido'], dni=data['dni'], fecha_nacimiento=data['fecha_nacimiento'], año=data['año'], division=data['division'])
            return user
        PersonalStaff.objects.create(
            user=user,
            nombre=data['nombre'],
            apellido=data['apellido'],
            dni=data['dni'],
            telefono=data.get('telefono', ''),
            email=data.get('email', ''),
        )
        return user

    def validate(self, data):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(data['password'])
        except ValidationError as exc:
            raise serializers.ValidationError({'password': exc.messages})
        if data.get('rol') == 'estudiante':
            missing = [k for k in ('fecha_nacimiento','año','division') if not data.get(k)]
            if missing:
                raise serializers.ValidationError({k: 'Campo obligatorio para estudiante.' for k in missing})
            if not Curso.objects.filter(año=data['año'], division=data['division']).exists():
                raise serializers.ValidationError({'division': 'El curso no existe.'})
        return data

class NotificacionSerializer(serializers.ModelSerializer):
    remitente_nombre = serializers.SerializerMethodField()
    remitente_username = serializers.CharField(source='remitente.username', read_only=True, allow_null=True)
    silent = serializers.SerializerMethodField()

    class Meta:
        model = Notificacion
        fields = [
            'id', 'usuario', 'tipo', 'titulo', 'cuerpo',
            'leido', 'fecha_creacion', 'metadata',
            'remitente', 'remitente_nombre', 'remitente_username',
            'silent', 'pendiente',
        ]
        read_only_fields = ['id', 'usuario', 'fecha_creacion']

    def get_remitente_nombre(self, obj):
        if not obj.remitente:
            return None
        return obj.remitente.get_full_name() or obj.remitente.username

    def get_silent(self, obj):
        """Determina si la notificación debe ser silenciosa según preferencias actuales."""
        try:
            from ..models import NotificacionPreferencia
            pref = NotificacionPreferencia.objects.get(usuario=obj.usuario)
            if not pref.cuenta_activa:
                return True
            tipo_map = {
                'mensaje': 'notif_mensaje',
                'comunicado': 'notif_comunicado',
                'evento': 'notif_evento',
                'asistencia': 'notif_asistencia',
                'notas': 'notif_notas',
                'alumno': 'notif_alumno',
                'preceptor': 'notif_preceptor',
            }
            field = tipo_map.get(obj.tipo)
            if field and not getattr(pref, field, True):
                return True
        except Exception:
            pass
        return False

class NotificacionPreferenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificacionPreferencia
        fields = [
            'notif_mensaje', 'notif_comunicado', 'notif_evento',
            'notif_asistencia', 'notif_notas', 'notif_alumno',
            'notif_preceptor', 'cuenta_activa',
        ]

