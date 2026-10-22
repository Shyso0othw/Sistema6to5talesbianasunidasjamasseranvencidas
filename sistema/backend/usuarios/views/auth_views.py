from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions, serializers
from django.db import transaction
import logging
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.db.models import Q, Sum, F
import datetime
from datetime import timedelta, date
from django.shortcuts import get_object_or_404
import json
from django.db import connections

from usuarios.models import *
from usuarios.serializers import *
from usuarios.ws_utils import *
from usuarios.chat_network import can_chat, ROLES_EXCLUIDOS_CONTACTOS
from usuarios.permissions import CanManageUsers


class HealthCheckView(APIView):
    """Health check endpoint for load balancers and monitoring.
    Returns 200 if Django, DB, and Redis are healthy.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.conf import settings
        from redis import Redis
        checks = {'django': {'status':'ok'}}
        healthy = True
        try:
            with connections['default'].cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
            checks['database'] = {'status':'ok'}
        except Exception:
            checks['database'] = {'status':'error'}
            healthy = False
        backend = settings.CHANNEL_LAYERS.get('default', {}).get('BACKEND', '')
        if backend == 'channels.layers.InMemoryChannelLayer':
            checks['redis'] = {'status':'not_tested', 'mode':'in_memory'}
            if not settings.DEBUG:
                healthy = False
        elif backend == 'channels_redis.core.RedisChannelLayer':
            try:
                with Redis.from_url(settings.REDIS_URL, socket_connect_timeout=1, socket_timeout=1) as redis:
                    redis.ping()
                checks['redis'] = {'status':'ok'}
            except Exception:
                checks['redis'] = {'status':'error'}
                healthy = False
        else:
            checks['redis'] = {'status':'not_configured'}
            healthy = False
        return Response({'status':'ok' if healthy else 'degraded','checks':checks}, status=200 if healthy else 503)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        user = authenticate(request, username=username, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)

            # Obtener el rol del usuario a través de su perfil
            rol = 'sin_rol'
            nombre = user.get_full_name() or user.username
            roles = []
            try:
                perfil = user.perfil
                rol = perfil.rol.nombre
                roles = perfil.get_all_roles()
            except Exception:
                roles = [rol]

            # Preparar respuesta base
            response_data = {
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'rol': rol,
                'roles': roles,
                'nombre': nombre,
                'username': user.username,
                'user_id': user.id,
                'mensaje': 'Login exitoso'
            }

            # Si es un alumno, agregar información adicional
            try:
                alumno = user.alumno
                response_data.update({
                    'is_alumno': True,
                    'alumno_id': alumno.id,
                    'apellido': alumno.apellido,
                    'dni': alumno.dni,
                    'año': alumno.año,
                    'division': alumno.division,
                    'email': alumno.email,
                })
            except:
                response_data['is_alumno'] = False

            return Response(response_data, status=status.HTTP_200_OK)

        return Response({'error': 'Credenciales inválidas'},
            status=status.HTTP_401_UNAUTHORIZED
        )

class PerfilView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = PerfilUsuarioSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

class CambiarContrasenaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current = request.data.get('current_password', '')
        new_pw = request.data.get('new_password', '')
        if not current or not new_pw:
            return Response({'error': 'Ambos campos son obligatorios'}, status=status.HTTP_400_BAD_REQUEST)
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(new_pw, request.user)
        except ValidationError as exc:
            return Response({'error': exc.messages}, status=400)
        if not request.user.check_password(current):
            return Response({'error': 'La contraseña actual no es correcta'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new_pw)
        request.user.save()
        return Response({'mensaje': 'Contraseña cambiada correctamente'}, status=status.HTTP_200_OK)

class CrearUsuarioSimpleView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageUsers]

    def post(self, request):
        from usuarios.account_policy import validate_assigned_role
        validate_assigned_role(request.user, request.data.get('rol'))
        serializer = CrearUsuarioSimpleSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            user = serializer.save()
        return Response({'id': user.id, 'username': user.username,
                         'nombre': user.first_name, 'apellido': user.last_name,
                         'mensaje': 'Cuenta creada exitosamente'}, status=201)

class DesactivarCuentaView(APIView):
    """Desactiva la cuenta del usuario (no recibe notificaciones)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        pref, _ = NotificacionPreferencia.objects.get_or_create(usuario=request.user)
        pref.cuenta_activa = False
        pref.save(update_fields=['cuenta_activa'])
        return Response({'status': 'ok', 'cuenta_activa': False})

class ActivarCuentaView(APIView):
    """Reactiva la cuenta del usuario y entrega notificaciones pendientes"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        pref, _ = NotificacionPreferencia.objects.get_or_create(usuario=request.user)
        pref.cuenta_activa = True
        pref.save(update_fields=['cuenta_activa'])
        from ..ws_utils import entregar_pendientes
        entregar_pendientes(request.user)
        return Response({'status': 'ok', 'cuenta_activa': True})

class UsuariosListView(generics.ListAPIView):
    """Lista todos los usuarios excepto el usuario actual (para chatear)"""
    serializer_class = UsuarioSimpleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = User.objects.filter(
            perfil__isnull=False
        ).exclude(
            id=self.request.user.id
        ).distinct().order_by('first_name', 'last_name', 'username')

        # Los roles excluidos (p.ej. admin) no aparecen como contactos de chat
        excluidos = [r for r in ROLES_EXCLUIDOS_CONTACTOS]
        if excluidos:
            qs = qs.exclude(perfil__rol__nombre__in=excluidos)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(username__icontains=search)
            )

        qs = qs.prefetch_related('perfil__rol', 'perfil__roles')

        # Solo contactos con los que el usuario actual puede chatear (red de chat)
        ids = [u.id for u in qs if can_chat(self.request.user, u)]

        return User.objects.filter(id__in=ids).order_by('first_name', 'last_name', 'username')

