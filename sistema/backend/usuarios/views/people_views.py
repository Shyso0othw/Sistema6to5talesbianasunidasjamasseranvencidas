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
from usuarios.serializers import *
from usuarios.ws_utils import *
from usuarios.permissions import CanManageUsers, CanManagePersonalStaff
from usuarios.access import PeopleScopeMixin, ScopedDetailMixin
from usuarios.account_policy import validate_assigned_role, require_target

class AlumnoListCreateView(PeopleScopeMixin, generics.ListCreateAPIView):
    queryset = Alumno.objects.all().order_by('apellido', 'nombre')
    serializer_class = AlumnoSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageUsers()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        alumno = serializer.save()
        self._notificar_alumno(alumno)

    def _notificar_alumno(self, alumno):
        from ..serializers import AlumnoSerializer
        from ..ws_utils import crear_y_notificar

        data = AlumnoSerializer(alumno).data
        payload = {'type': 'alumno.created', 'alumno': data}

        for rol in ('admin', 'secretario', 'director'):
            notify_group(f'role_{rol}', payload)

        roles_admin = Rol.objects.filter(nombre__in=['admin', 'secretario', 'secretaria', 'preceptor', 'jefe_preceptores'])
        usuarios = User.objects.filter(perfil__rol__in=roles_admin).distinct()
        for user in usuarios:
            crear_y_notificar(
                usuario=user,
                tipo='alumno',
                titulo=f"Nuevo alumno: {alumno.apellido}, {alumno.nombre}",
                cuerpo=f"{alumno.año}° {alumno.division} - DNI: {alumno.dni}",
                remitente=self.request.user if hasattr(self, 'request') and self.request.user.is_authenticated else None,
                metadata={'alumno_id': alumno.id},
            )

class AlumnoDetailView(ScopedDetailMixin, PeopleScopeMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Alumno.objects.all()
    serializer_class = AlumnoSerializer

    def get_permissions(self):
        if self.request.method in ('PATCH', 'PUT', 'DELETE'):
            return [CanManageUsers()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        return AlumnoSerializer

class CrearUsuarioAlumnoView(APIView):
    permission_classes = [CanManageUsers]

    def post(self, request, *args, **kwargs):
        role = 'estudiante'
        validate_assigned_role(request.user, role)
        record = get_object_or_404(Alumno, pk=request.data.get('alumno_id'))
        if kwargs.get('pk') and str(record.pk) != str(kwargs['pk']):
            raise serializers.ValidationError('El ID de la ruta y el registro deben coincidir.')
        require_target(request.user, record)
        serializer = CrearUsuarioAlumnoSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
        return Response(AlumnoSerializer(instance, context={'request': request}).data, status=201)

class PreceptorListCreateView(PeopleScopeMixin, generics.ListCreateAPIView):
    queryset = Preceptor.objects.all().order_by('apellido', 'nombre')
    serializer_class = PreceptorSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageUsers()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        preceptor = serializer.save()
        self._notificar_preceptor(preceptor)

    def _notificar_preceptor(self, preceptor):
        from ..serializers import PreceptorSerializer
        from ..ws_utils import crear_y_notificar

        data = PreceptorSerializer(preceptor).data
        payload = {'type': 'preceptor.created', 'preceptor': data}

        for rol in ('admin', 'secretario', 'director'):
            notify_group(f'role_{rol}', payload)

        roles_admin = Rol.objects.filter(nombre__in=['admin', 'secretario', 'secretaria', 'director', 'directivo'])
        usuarios = User.objects.filter(perfil__rol__in=roles_admin).distinct()
        for user in usuarios:
            crear_y_notificar(
                usuario=user,
                tipo='preceptor',
                titulo=f"Nuevo preceptor: {preceptor.apellido}, {preceptor.nombre}",
                cuerpo=f"DNI: {preceptor.dni}",
                remitente=self.request.user if hasattr(self, 'request') and self.request.user.is_authenticated else None,
metadata={'preceptor_id': preceptor.id},
    )

class PreceptorDetailView(ScopedDetailMixin, PeopleScopeMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Preceptor.objects.all()
    serializer_class = PreceptorSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageUsers()]
        return [permissions.IsAuthenticated()]

class CrearUsuarioPreceptorView(APIView):
    permission_classes = [CanManageUsers]

    def post(self, request, *args, **kwargs):
        role = 'preceptor'
        validate_assigned_role(request.user, role)
        record = get_object_or_404(Preceptor, pk=request.data.get('preceptor_id'))
        if kwargs.get('pk') and str(record.pk) != str(kwargs['pk']):
            raise serializers.ValidationError('El ID de la ruta y el registro deben coincidir.')
        require_target(request.user, record)
        serializer = CrearUsuarioPreceptorSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
        return Response(PreceptorSerializer(instance, context={'request': request}).data, status=201)

class DocenteListCreateView(PeopleScopeMixin, generics.ListCreateAPIView):
    queryset = Docente.objects.all().order_by('apellido', 'nombre')
    serializer_class = DocenteSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageUsers()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        self._notificar_docente(serializer.instance)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _notificar_docente(self, docente):
        from ..ws_utils import crear_y_notificar

        data = DocenteSerializer(docente).data
        payload = {'type': 'docente.created', 'docente': data}
        for rol in ('admin', 'secretario', 'director'):
            notify_group(f'role_{rol}', payload)

        roles_admin = Rol.objects.filter(nombre__in=['admin', 'secretario', 'secretaria', 'director', 'directivo', 'jefe_area', 'jefe_departamento'])
        usuarios = User.objects.filter(perfil__rol__in=roles_admin).distinct()
        for user in usuarios:
            crear_y_notificar(
                usuario=user,
                tipo='docente',
                titulo=f"Nuevo docente: {docente.apellido}, {docente.nombre}",
                cuerpo=f"DNI: {docente.dni}",
                remitente=self.request.user if hasattr(self, 'request') and self.request.user.is_authenticated else None,
                metadata={'docente_id': docente.id},
            )

class DocenteDetailView(ScopedDetailMixin, PeopleScopeMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Docente.objects.all()
    serializer_class = DocenteSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageUsers()]
        return [permissions.IsAuthenticated()]

class CrearUsuarioDocenteView(APIView):
    permission_classes = [CanManageUsers]

    def post(self, request, *args, **kwargs):
        role = 'profesor'
        validate_assigned_role(request.user, role)
        record = get_object_or_404(Docente, pk=request.data.get('docente_id'))
        if kwargs.get('pk') and str(record.pk) != str(kwargs['pk']):
            raise serializers.ValidationError('El ID de la ruta y el registro deben coincidir.')
        require_target(request.user, record)
        serializer = CrearUsuarioDocenteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
        return Response(DocenteSerializer(instance, context={'request': request}).data, status=201)

class FamiliaListCreateView(PeopleScopeMixin, generics.ListCreateAPIView):
    queryset = Familia.objects.all().order_by('apellido', 'nombre')
    serializer_class = FamiliaSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageUsers()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        familia = serializer.save()
        self._notificar_familia(familia)

    def _notificar_familia(self, familia):
        from ..ws_utils import crear_y_notificar

        data = FamiliaSerializer(familia).data
        payload = {'type': 'familia.created', 'familia': data}
        for rol in ('admin', 'secretario', 'director'):
            notify_group(f'role_{rol}', payload)

        roles_admin = Rol.objects.filter(nombre__in=['admin', 'secretario', 'secretaria'])
        usuarios = User.objects.filter(perfil__rol__in=roles_admin).distinct()
        for user in usuarios:
            crear_y_notificar(
                usuario=user,
                tipo='familia',
                titulo=f"Nueva familia: {familia.apellido}, {familia.nombre}",
                cuerpo=f"DNI: {familia.dni}",
                remitente=self.request.user if hasattr(self, 'request') and self.request.user.is_authenticated else None,
                metadata={'familia_id': familia.id},
            )

class FamiliaDetailView(ScopedDetailMixin, PeopleScopeMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Familia.objects.all()
    serializer_class = FamiliaSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageUsers()]
        return [permissions.IsAuthenticated()]

class CrearUsuarioFamiliaView(APIView):
    permission_classes = [CanManageUsers]

    def post(self, request, *args, **kwargs):
        role = 'familia'
        validate_assigned_role(request.user, role)
        record = get_object_or_404(Familia, pk=request.data.get('familia_id'))
        if kwargs.get('pk') and str(record.pk) != str(kwargs['pk']):
            raise serializers.ValidationError('El ID de la ruta y el registro deben coincidir.')
        require_target(request.user, record)
        serializer = CrearUsuarioFamiliaSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
        return Response(FamiliaSerializer(instance, context={'request': request}).data, status=201)

class PersonalStaffListCreateView(PeopleScopeMixin, generics.ListCreateAPIView):
    queryset = PersonalStaff.objects.all().order_by('apellido', 'nombre')
    serializer_class = PersonalStaffSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManagePersonalStaff()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class PersonalStaffDetailView(ScopedDetailMixin, PeopleScopeMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = PersonalStaff.objects.all()
    serializer_class = PersonalStaffSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManagePersonalStaff()]
        return [permissions.IsAuthenticated()]

class CrearUsuarioPersonalStaffView(APIView):
    permission_classes = [CanManagePersonalStaff]

    def post(self, request, *args, **kwargs):
        role = request.data.get('rol')
        validate_assigned_role(request.user, role)
        record = get_object_or_404(PersonalStaff, pk=request.data.get('personal_staff_id'))
        if kwargs.get('pk') and str(record.pk) != str(kwargs['pk']):
            raise serializers.ValidationError('El ID de la ruta y el registro deben coincidir.')
        require_target(request.user, record)
        serializer = CrearUsuarioPersonalStaffSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
        return Response(PersonalStaffSerializer(instance, context={'request': request}).data, status=201)

