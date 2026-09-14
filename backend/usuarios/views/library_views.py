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
from usuarios.permissions import CanManageLibrary, get_user_roles
from usuarios.access import ScopedDetailMixin

class LibroListCreateView(generics.ListCreateAPIView):
    queryset = Libro.objects.all().order_by('titulo')
    serializer_class = LibroSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageLibrary()]
        return [permissions.IsAuthenticated()]

class LibroDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Libro.objects.all()
    serializer_class = LibroSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageLibrary()]
        return [permissions.IsAuthenticated()]

    def perform_destroy(self, instance):
        with transaction.atomic():
            book = Libro.objects.select_for_update().get(pk=instance.pk)
            if book.prestamos.exists():
                raise serializers.ValidationError('El libro tiene historial de préstamos y no puede eliminarse.')
            book.delete()

class PrestamoListCreateView(generics.ListCreateAPIView):
    queryset = Prestamo.objects.all().order_by('-fecha_prestamo')
    serializer_class = PrestamoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageLibrary()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        try:
            perfil = user.perfil
            roles = perfil.get_all_roles()
        except Exception:
            roles = []

        if 'bibliotecario' in roles or 'admin' in roles:
            pass  # can see all
        else:
            qs = qs.filter(usuario=user)

        usuario = self.request.query_params.get('usuario')
        if usuario:
            qs = qs.filter(usuario_id=usuario)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        prestamo = serializer.save()
        crear_y_notificar(
            usuario=prestamo.usuario, tipo='prestamo',
            titulo=f"Nuevo préstamo: {prestamo.libro.titulo}",
            cuerpo=f"Te asignaron \"{prestamo.libro.titulo}\" — Consultá el estado desde Préstamos; Biblioteca gestiona la entrega",
            remitente=None,
            metadata={'prestamo_id': prestamo.id, 'tipo': 'pendiente'}
        )
        return Response(PrestamoSerializer(prestamo).data, status=status.HTTP_201_CREATED)

class PrestamoDetailView(ScopedDetailMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Prestamo.objects.all()
    serializer_class = PrestamoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageLibrary()]
        return [permissions.IsAuthenticated()]

    def perform_destroy(self, instance):
        from usuarios.serializers.library_serializers import ACTIVE_LOANS
        with transaction.atomic():
            loan = Prestamo.objects.select_for_update().get(pk=instance.pk)
            if loan.estado in ACTIVE_LOANS:
                raise serializers.ValidationError('Registre primero la devolución antes de eliminar el préstamo.')
            loan.delete()

    def get_queryset(self):
        qs = Prestamo.objects.all()
        if not (self.request.user.is_superuser or get_user_roles(self.request.user) & {'admin','bibliotecario'}):
            qs = qs.filter(usuario=self.request.user)
        return qs.order_by('-pk')

class PrestamoPendientesView(generics.ListAPIView):
    serializer_class = PrestamoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Prestamo.objects.all()
        if not (self.request.user.is_superuser or get_user_roles(self.request.user) & {'admin','bibliotecario'}):
            qs = qs.filter(usuario=self.request.user)
        return qs.order_by('-pk').filter(estado__in=['Pendiente','Solicitado'])

class PrestamoSolicitarView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        libro_id = request.data.get('libro_id')
        if not libro_id:
            return Response({'detail': 'libro_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            libro = Libro.objects.get(id=libro_id)
        except Libro.DoesNotExist:
            return Response({'detail': 'Libro no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        if libro.disponibles < 1:
            return Response({'detail': 'No hay copias disponibles'}, status=status.HTTP_400_BAD_REQUEST)
        prestamo = Prestamo.objects.create(
            libro=libro, usuario=request.user, solicitante=request.user,
            fecha_prestamo=timezone.now().date(),
            fecha_entrega=timezone.now().date() + timedelta(days=7),
            estado='Solicitado'
        )
        roles_biblioteca = Rol.objects.filter(nombre__in=['bibliotecario'])
        bibliotecarios = User.objects.filter(perfil__rol__in=roles_biblioteca).distinct()
        for biblio in bibliotecarios:
            crear_y_notificar(
                usuario=biblio, tipo='prestamo',
                titulo=f"Solicitud de préstamo: {libro.titulo}",
                cuerpo=f"{request.user.get_full_name() or request.user.username} solicitó \"{libro.titulo}\"",
                remitente=None,
                metadata={'prestamo_id': prestamo.id, 'tipo': 'solicitud'}
            )
        return Response(PrestamoSerializer(prestamo).data, status=status.HTTP_201_CREATED)

class PrestamoAceptarView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageLibrary]

    def post(self, request, pk):
        with transaction.atomic():
            prestamo = get_object_or_404(Prestamo.objects.select_for_update(), pk=pk)
            libro = Libro.objects.select_for_update().get(pk=prestamo.libro_id)
            if prestamo.estado not in ('Pendiente','Solicitado'):
                return Response({'detail': 'El préstamo no está pendiente.'}, status=400)
            if libro.disponibles < 1:
                return Response({'detail': 'No hay copias disponibles.'}, status=400)
            payload = {k:v for k,v in request.data.items() if k in ('fecha_entrega','hora_desde','hora_hasta','dias')}
            serializer = PrestamoSerializer(prestamo, data=payload, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(estado='En posesion')
        crear_y_notificar(prestamo.usuario, 'prestamo', 'Préstamo aceptado', libro.titulo, metadata={'prestamo_id': prestamo.pk})
        return Response(serializer.data)

class PrestamoRechazarView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageLibrary]

    def post(self, request, pk):
        with transaction.atomic():
            loan = get_object_or_404(Prestamo.objects.select_for_update(), pk=pk)
            if loan.estado not in ('Pendiente', 'Solicitado'):
                return Response({'detail': 'El préstamo no está pendiente.'}, status=400)
            serializer = PrestamoSerializer(loan, data={'estado': 'Rechazado'}, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(serializer.data)

