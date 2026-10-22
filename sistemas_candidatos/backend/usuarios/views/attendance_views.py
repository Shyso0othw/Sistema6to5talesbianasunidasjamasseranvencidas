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

from usuarios.models import *
from usuarios.access import academic_scope, require_academic_write, visible_courses, visible_students, ScopedDetailMixin
from usuarios.serializers import *
from usuarios.ws_utils import *
from usuarios.permissions import CanManageAcademic, CanManageAsistenciaPersonal, IsStudentOwnerOrAcademic

ROLES_EDITAR_NOTAS_ASISTENCIA = {'preceptor', 'directivo', 'admin', 'director', 'secretario'}

class AsistenciaListCreateView(generics.ListCreateAPIView):
    """Listar y crear asistencias de estudiantes"""
    serializer_class = AsistenciaSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageAcademic()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = academic_scope(self.request.user, Asistencia)
        for field in ('estudiante', 'materia'):
            value = self.request.query_params.get(field)
            if value:
                qs = qs.filter(**{field+'_id': value})
        return qs.order_by('pk')

    def perform_create(self, serializer):
        data = serializer.validated_data
        obj = serializer.instance
        require_academic_write(self.request.user, data.get('estudiante', getattr(obj, 'estudiante', None)), data.get('materia', getattr(obj, 'materia', None)))
        serializer.save()

class AsistenciaDetailView(ScopedDetailMixin, generics.RetrieveUpdateDestroyAPIView):
    """Obtener, actualizar o eliminar una asistencia"""
    queryset = Asistencia.objects.select_related('estudiante', 'materia').all()
    serializer_class = AsistenciaSerializer
    permission_classes = [permissions.IsAuthenticated, IsStudentOwnerOrAcademic]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageAcademic()]
        return [permissions.IsAuthenticated(), IsStudentOwnerOrAcademic()]

    def perform_update(self, serializer):
        data = serializer.validated_data
        obj = serializer.instance
        require_academic_write(self.request.user, data.get('estudiante', getattr(obj, 'estudiante', None)), data.get('materia', getattr(obj, 'materia', None)))
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

    def get_queryset(self):
        return academic_scope(self.request.user, Asistencia)

class AsistenciaPersonalListCreateView(generics.ListCreateAPIView):
    queryset = AsistenciaPersonal.objects.all().order_by('-fecha', 'apellido')
    serializer_class = AsistenciaPersonalSerializer

    def get_permissions(self):
        return [CanManageAsistenciaPersonal()]

    def get_queryset(self):
        qs = super().get_queryset()
        cargo = self.request.query_params.get('cargo')
        if cargo:
            qs = qs.filter(cargo__icontains=cargo)
        return qs

    def perform_create(self, serializer):
        asistencia = serializer.save()
        self._notificar_asistencia(asistencia, 'created')

    def _notificar_asistencia(self, asistencia, action):
        from ..ws_utils import crear_y_notificar

        data = AsistenciaPersonalSerializer(asistencia).data
        payload = {'type': 'asistencia.updated', 'asistencia': data, 'action': action}
        for rol in ('admin', 'secretario', 'director'):
            notify_group(f'role_{rol}', payload)

        roles_interesados = Rol.objects.filter(nombre__in=['admin', 'secretario', 'secretaria', 'director', 'directivo'])
        usuarios = User.objects.filter(perfil__rol__in=roles_interesados).distinct()
        for user in usuarios:
            crear_y_notificar(
                usuario=user,
                tipo='asistencia',
                titulo=f"Asistencia registrada: {asistencia.apellido}, {asistencia.nombre}",
                cuerpo=f"{asistencia.fecha} - {asistencia.turno} - {asistencia.cargo}",
                remitente=self.request.user if hasattr(self, 'request') and self.request.user.is_authenticated else None,
                metadata={'asistencia_id': asistencia.id, 'action': action},
            )

class AsistenciaPersonalDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = AsistenciaPersonal.objects.all()
    serializer_class = AsistenciaPersonalSerializer

    def get_permissions(self):
        return [CanManageAsistenciaPersonal()]

    def perform_update(self, serializer):
        asistencia = serializer.save()
        self._notificar_asistencia(asistencia, 'updated')

    def perform_destroy(self, instance):
        self._notificar_asistencia(instance, 'deleted')
        super().perform_destroy(instance)

    def _notificar_asistencia(self, asistencia, action):
        from ..ws_utils import crear_y_notificar

        payload = {'type': 'asistencia.updated', 'asistencia': {'id': asistencia.id, 'nombre': asistencia.nombre, 'apellido': asistencia.apellido}, 'action': action}
        for rol in ('admin', 'secretario', 'director'):
            notify_group(f'role_{rol}', payload)

        roles_interesados = Rol.objects.filter(nombre__in=['admin', 'secretario', 'secretaria', 'director', 'directivo'])
        usuarios = User.objects.filter(perfil__rol__in=roles_interesados).distinct()
        for user in usuarios:
            crear_y_notificar(
                usuario=user,
                tipo='asistencia',
                titulo=f"Asistencia {action}: {asistencia.apellido}, {asistencia.nombre}",
                cuerpo=f"{asistencia.fecha} - {asistencia.turno}",
                remitente=self.request.user if hasattr(self, 'request') and self.request.user.is_authenticated else None,
                metadata={'asistencia_id': asistencia.id, 'action': action},
            )

class AsistenciaDiariaListCreateView(generics.ListCreateAPIView):
    serializer_class = AsistenciaDiariaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = academic_scope(self.request.user, AsistenciaDiaria)
        for key in ('fecha', 'estudiante'):
            if self.request.query_params.get(key):
                qs = qs.filter(**{key: self.request.query_params[key]})
        return qs.order_by('-fecha', '-pk')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        # The endpoint is an explicit upsert on (student, date).
        serializer.validators = []
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        require_academic_write(request.user, data['estudiante'])
        with transaction.atomic():
            obj, created = AsistenciaDiaria.objects.update_or_create(
                estudiante=data['estudiante'], fecha=data['fecha'], defaults={'estado': data.get('estado', 'Presente')})
        return Response(self.get_serializer(obj).data, status=201 if created else 200)

    def get_permissions(self):
        return [CanManageAcademic()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]

class AsistenciaDiariaDetailView(ScopedDetailMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = AsistenciaDiaria.objects.all()
    serializer_class = AsistenciaDiariaSerializer
    permission_classes = [permissions.IsAuthenticated, IsStudentOwnerOrAcademic]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageAcademic()]
        return [permissions.IsAuthenticated(), IsStudentOwnerOrAcademic()]

    def get_queryset(self):
        return academic_scope(self.request.user, AsistenciaDiaria)

    def perform_update(self, serializer):
        require_academic_write(self.request.user, serializer.validated_data.get('estudiante', serializer.instance.estudiante))
        serializer.save()

