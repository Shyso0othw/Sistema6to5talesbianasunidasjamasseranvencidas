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
from usuarios.permissions import (
    CanManageAcademic, CanManageHorarios, CanViewHorarios, CanManageCatalog,
    IsStudentOwnerOrAcademic,
)

ROLES_EDITAR_NOTAS_ASISTENCIA = {'preceptor', 'directivo', 'admin', 'director', 'secretario'}

class MisCursosDocenteView(APIView):
    """Devuelve los cursos asignados al docente autenticado"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            docente = user.docente
        except Docente.DoesNotExist:
            return Response({'error': 'El usuario no es un docente'}, status=403)

        cursos = docente.cursos_asignados.filter(activo=True).order_by('año', 'division')
        from usuarios.serializers import CursoSerializer
        serializer = CursoSerializer(cursos, many=True)
        return Response(serializer.data)


class MisMateriasDocenteView(APIView):
    """Devuelve las materias asignadas al docente autenticado"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            docente = user.docente
        except Docente.DoesNotExist:
            return Response({'error': 'El usuario no es un docente'}, status=403)

        materias = docente.materias.all().order_by('nombre')
        from usuarios.serializers import MateriaSerializer
        serializer = MateriaSerializer(materias, many=True)
        return Response(serializer.data)


class MisCursosDocenteView(APIView):
    """Devuelve los cursos asignados al docente autenticado"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            docente = user.docente
        except Docente.DoesNotExist:
            return Response({'error': 'El usuario no es un docente'}, status=403)

        cursos = docente.cursos_asignados.filter(activo=True).order_by('año', 'division')
        from usuarios.serializers import CursoSerializer
        serializer = CursoSerializer(cursos, many=True)
        return Response(serializer.data)


class MisMateriasDocenteView(APIView):
    """Devuelve las materias asignadas al docente autenticado"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            docente = user.docente
        except Docente.DoesNotExist:
            return Response({'error': 'El usuario no es un docente'}, status=403)

        materias = docente.materias.all().order_by('nombre')
        from usuarios.serializers import MateriaSerializer
        serializer = MateriaSerializer(materias, many=True)
        return Response(serializer.data)


class OrientacionListCreateView(generics.ListCreateAPIView):
    queryset = Orientacion.objects.all().order_by('nombre')
    serializer_class = OrientacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageCatalog()]
        return [permissions.IsAuthenticated()]

class OrientacionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Orientacion.objects.all()
    serializer_class = OrientacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageCatalog()]
        return [permissions.IsAuthenticated()]

class CursoListCreateView(generics.ListCreateAPIView):
    queryset = Curso.objects.all().order_by('año', 'division')
    serializer_class = CursoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageCatalog()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return visible_courses(self.request.user).order_by('año', 'division', 'pk')

class CursoDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageCatalog()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return visible_courses(self.request.user).order_by('año', 'division', 'pk')

class MateriaListCreateView(generics.ListCreateAPIView):
    queryset = Materia.objects.all().order_by('nombre')
    serializer_class = MateriaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageCatalog()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return Materia.objects.filter(curso__in=visible_courses(self.request.user)).order_by('nombre', 'pk')

class MateriaDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Materia.objects.all()
    serializer_class = MateriaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageCatalog()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return Materia.objects.filter(curso__in=visible_courses(self.request.user)).order_by('nombre', 'pk')

class HorarioListCreateView(generics.ListCreateAPIView):
    queryset = Horario.objects.select_related('curso', 'materia').all().order_by('dia', 'franja')
    serializer_class = HorarioSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageHorarios()]
        return [CanViewHorarios()]

    def get_queryset(self):
        qs = Horario.objects.filter(curso__in=visible_courses(self.request.user))
        if self.request.query_params.get('curso'):
            qs = qs.filter(curso_id=self.request.query_params['curso'])
        return qs.order_by('dia', 'franja', 'pk')

    def perform_create(self, serializer):
        horario = serializer.save()
        try:
            _notificar_horario_curso(horario, self.request.user, creado=True)
        except Exception:
            logger = logging.getLogger(__name__)
            logger.exception('Error notificando horario creado')

class HorarioDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Horario.objects.select_related('curso', 'materia').all()
    serializer_class = HorarioSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageHorarios()]
        return [CanViewHorarios()]

    def perform_update(self, serializer):
        horario = serializer.save()
        try:
            _notificar_horario_curso(horario, self.request.user, creado=False)
        except Exception:
            logger = logging.getLogger(__name__)
            logger.exception('Error notificando horario modificado')

    def perform_destroy(self, instance):
        try:
            _notificar_horario_curso(instance, self.request.user, eliminado=True)
        except Exception:
            logger = logging.getLogger(__name__)
            logger.exception('Error notificando horario eliminado')
        instance.delete()

    def get_queryset(self):
        return Horario.objects.filter(curso__in=visible_courses(self.request.user))

class HorarioMoveView(APIView):
    """Mueve un horario a otra franja/día dentro del mismo curso.
    Si la nueva franja está ocupada, desplaza en cadena las franjas posteriores.
    Si no hay espacio dentro del límite de franjas, se realiza un intercambio (swap).
    """
    permission_classes = [CanManageHorarios]

    def post(self, request, pk):
        logger = logging.getLogger(__name__)
        try:
            new_dia = int(request.data.get('dia'))
            new_franja = int(request.data.get('franja'))
        except Exception:
            return Response({'detail': 'Datos inválidos'}, status=status.HTTP_400_BAD_REQUEST)

        if new_dia not in range(5):
            return Response({'detail': 'Día fuera de rango'}, status=400)

        # permisos: solo roles administrativos o docentes/preceptores pueden mover horarios
        allowed_roles = {'admin', 'secretario', 'secretaria', 'director', 'directivo', 'jefe_area', 'jefe_departamento', 'preceptor', 'profesor', 'jefe_preceptores'}
        try:
            perfil = request.user.perfil
            user_roles = perfil.get_all_roles()
        except Exception:
            user_roles = []

        if not any(r in allowed_roles for r in user_roles):
            return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)

        # Ejecutar toda la operación bajo la misma transacción y bloqueo
        with transaction.atomic():
            try:
                fuente = Horario.objects.select_for_update().get(pk=pk)
            except Horario.DoesNotExist:
                return Response({'detail': 'Horario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

            curso = Curso.objects.select_for_update().get(pk=fuente.curso_id)

            # determinar máximo de franjas según ciclo (basico/superior) y validar tipo de franja
            try:
                año = int(getattr(curso, 'año', getattr(curso, 'anio', 0)))
            except Exception:
                año = 0
            MAX_INDEX = 18 if año >= 4 else 14

            # Definición de franjas (coincide con frontend/src/pages/horarioUtils.js)
            FRANJAS_CB = [
                {'inicio': '07:45', 'fin': '08:45'},
                {'inicio': '08:45', 'fin': '09:45'},
                {'inicio': '09:45', 'fin': '10:00', 'tipo': 'recreo'},
                {'inicio': '10:00', 'fin': '11:00'},
                {'inicio': '11:00', 'fin': '12:00'},
                {'inicio': '12:00', 'fin': '13:10', 'tipo': 'receso'},
                {'inicio': '13:10', 'fin': '14:10'},
                {'inicio': '14:10', 'fin': '15:10'},
                {'inicio': '15:10', 'fin': '15:25', 'tipo': 'recreo'},
                {'inicio': '15:25', 'fin': '16:25'},
                {'inicio': '16:25', 'fin': '17:25'},
                {'inicio': '17:25', 'fin': '18:25'},
                {'inicio': '18:25', 'fin': '19:25'},
                {'inicio': '19:25', 'fin': '20:25'},
                {'inicio': '20:25', 'fin': '21:25'},
            ]

            FRANJAS_CS = [
                {'inicio': '07:45', 'fin': '08:45'},
                {'inicio': '08:45', 'fin': '08:55', 'tipo': 'recreo'},
                {'inicio': '08:55', 'fin': '09:55'},
                {'inicio': '09:55', 'fin': '10:55'},
                {'inicio': '10:55', 'fin': '11:05', 'tipo': 'recreo'},
                {'inicio': '11:05', 'fin': '12:05'},
                {'inicio': '12:05', 'fin': '13:10', 'tipo': 'receso'},
                {'inicio': '13:10', 'fin': '14:10'},
                {'inicio': '14:10', 'fin': '14:20', 'tipo': 'recreo'},
                {'inicio': '14:20', 'fin': '15:20'},
                {'inicio': '15:20', 'fin': '16:20'},
                {'inicio': '16:20', 'fin': '16:30', 'tipo': 'recreo'},
                {'inicio': '16:30', 'fin': '17:30'},
                {'inicio': '17:30', 'fin': '18:30'},
                {'inicio': '18:30', 'fin': '18:40', 'tipo': 'recreo'},
                {'inicio': '18:40', 'fin': '19:40'},
                {'inicio': '19:40', 'fin': '20:40'},
                {'inicio': '20:40', 'fin': '20:50', 'tipo': 'recreo'},
                {'inicio': '20:50', 'fin': '21:50'},
            ]

            franjas = FRANJAS_CS if año >= 4 else FRANJAS_CB

            if not (0 <= new_franja < len(franjas)):
                return Response({'detail': 'Franja fuera de rango'}, status=status.HTTP_400_BAD_REQUEST)

            tipo_objetivo = franjas[new_franja].get('tipo')
            if tipo_objetivo in ('recreo', 'receso'):
                return Response({'detail': 'No se permiten movimientos a franjas de recreo/receso'}, status=status.HTTP_400_BAD_REQUEST)

            # si objetivo es el mismo, nada que hacer
            if fuente.dia == new_dia and fuente.franja == new_franja:
                return Response({'status': 'ok', 'detail': 'sin cambios'})

            valid_slots = [i for i, slot in enumerate(franjas) if slot.get('tipo') not in ('recreo', 'receso')]
            def next_slot(index):
                return next((i for i in valid_slots if i > index), MAX_INDEX + 1)

            # recolectar la cadena de conflictos desde el destino hasta encontrar hueco o límite
            conflicts = []
            scan_franja = new_franja
            while True:
                conflict = Horario.objects.select_for_update().filter(curso=curso, dia=new_dia, franja=scan_franja).exclude(pk=fuente.pk).first()
                if conflict:
                    conflicts.append(conflict)
                    scan_franja = next_slot(scan_franja)
                    if scan_franja > MAX_INDEX:
                        break
                    continue
                else:
                    # hueco encontrado
                    break

            if conflicts and scan_franja > MAX_INDEX:
                # No hay hueco dentro del límite -> swap entre fuente y primer conflicto
                first_conflict = conflicts[0]
                # intercambio de posiciones
                src_dia, src_franja = fuente.dia, fuente.franja
                tgt_dia, tgt_franja = first_conflict.dia, first_conflict.franja
                first_conflict.dia, first_conflict.franja = src_dia, src_franja
                first_conflict.save(update_fields=['dia', 'franja'])
                fuente.dia, fuente.franja = tgt_dia, tgt_franja
                fuente.save(update_fields=['dia', 'franja'])

                # Notificar cambio de horario
                try:
                    titulo = f"Horario modificado: {fuente.curso}"
                    cuerpo = f"Se ejecutó un intercambio de franjas para la materia {fuente.materia.nombre}"
                    # Notificar alumnos del curso y sus familias
                    alumnos = Alumno.objects.filter(año=curso.año, division=curso.division)
                    for a in alumnos:
                        if a.user:
                            crear_y_notificar(usuario=a.user, tipo='sistema', titulo=titulo, cuerpo=cuerpo, remitente=request.user, metadata={'horario_id': fuente.id})
                            # notificar familias vinculadas
                            for fam in a.familias.all():
                                if fam.user:
                                    crear_y_notificar(usuario=fam.user, tipo='sistema', titulo=titulo, cuerpo=cuerpo, remitente=request.user, metadata={'horario_id': fuente.id})
                except Exception:
                    logger.exception('Error notificando cambio de horario')

                return Response({'status': 'ok', 'detail': 'swap ejecutado'})

            # Si encontré un hueco (scan_franja <= MAX_INDEX), desplazar en cadena desde el final hacia atrás
            if scan_franja <= MAX_INDEX:
                # desplazar cada conflicto al siguiente índice, empezando por el último
                for i in range(len(conflicts) - 1, -1, -1):
                    c = conflicts[i]
                    c.franja = next_slot(c.franja)
                    c.save(update_fields=['franja'])

                # finalmente colocar la fuente en la posición destino
                fuente.dia = new_dia
                fuente.franja = new_franja
                fuente.save(update_fields=['dia', 'franja'])

                # Notificar cambio de horario
                try:
                    titulo = f"Horario modificado: {fuente.curso}"
                    cuerpo = f"{fuente.materia.nombre} fue movida a día {new_dia} franja #{new_franja}"
                    alumnos = Alumno.objects.filter(año=curso.año, division=curso.division)
                    for a in alumnos:
                        if a.user:
                            crear_y_notificar(usuario=a.user, tipo='sistema', titulo=titulo, cuerpo=cuerpo, remitente=request.user, metadata={'horario_id': fuente.id})
                            for fam in a.familias.all():
                                if fam.user:
                                    crear_y_notificar(usuario=fam.user, tipo='sistema', titulo=titulo, cuerpo=cuerpo, remitente=request.user, metadata={'horario_id': fuente.id})
                except Exception:
                    logger.exception('Error notificando cambio de horario')

                return Response({'status': 'ok'})

            # caso por defecto: destino libre (no conflicts)
            fuente.dia = new_dia
            fuente.franja = new_franja
            fuente.save(update_fields=['dia', 'franja'])

            # Notificar cambio de horario
            try:
                titulo = f"Horario modificado: {fuente.curso}"
                cuerpo = f"{fuente.materia.nombre} fue movida a día {new_dia} franja #{new_franja}"
                alumnos = Alumno.objects.filter(año=curso.año, division=curso.division)
                for a in alumnos:
                    if a.user:
                        crear_y_notificar(usuario=a.user, tipo='sistema', titulo=titulo, cuerpo=cuerpo, remitente=request.user, metadata={'horario_id': fuente.id})
                        for fam in a.familias.all():
                            if fam.user:
                                crear_y_notificar(usuario=fam.user, tipo='sistema', titulo=titulo, cuerpo=cuerpo, remitente=request.user, metadata={'horario_id': fuente.id})
            except Exception:
                logger.exception('Error notifying schedule change')

            return Response({'status': 'ok'})

class NotaListCreateView(generics.ListCreateAPIView):
    """Listar y crear notas de estudiantes"""
    serializer_class = NotaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageAcademic()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = academic_scope(self.request.user, Nota)
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

class NotaDetailView(ScopedDetailMixin, generics.RetrieveUpdateDestroyAPIView):
    """Obtener, actualizar o eliminar una nota"""
    queryset = Nota.objects.select_related('estudiante', 'materia').all()
    serializer_class = NotaSerializer
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
        return academic_scope(self.request.user, Nota)

class BoletinView(APIView):
    """Devuelve todas las materias del curso del alumno con sus notas (o null si no hay)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        qs = visible_students(user)
        target = request.query_params.get('estudiante_id')
        alumno = get_object_or_404(qs, pk=target) if target else qs.filter(Q(user=user) | Q(familias__user=user)).first()
        if not alumno:
            raise PermissionDenied('Seleccione un alumno autorizado.')

        try:
            curso = Curso.objects.get(año=alumno.año, division=alumno.division)
        except Curso.DoesNotExist:
            return Response({'error': 'Curso no encontrado para el estudiante'}, status=404)

        materias = Materia.objects.filter(curso=curso).order_by('nombre')
        notas = Nota.objects.filter(estudiante=alumno)
        notas_map = {n.materia_id: n for n in notas}

        result = []
        for materia in materias:
            nota = notas_map.get(materia.id)
            from usuarios.models import Asistencia
            inasistencias = Asistencia.objects.filter(
                estudiante=alumno,
                materia=materia
            ).aggregate(total=models.Sum('ausentes'))['total'] or 0

            result.append({
                'id': nota.id if nota else None,
                'materia_id': materia.id,
                'materia_nombre': materia.nombre,
                'materia': materia.id,
                'estudiante': alumno.id,
                'estudiante_nombre': f"{alumno.apellido}, {alumno.nombre}",
                'v1': nota.v1 if nota else None,
                'n1': nota.n1 if nota else None,
                'vi1': nota.vi1 if nota else None,
                'i1': nota.i1 if nota else None,
                'v2': nota.v2 if nota else None,
                'n2': nota.n2 if nota else None,
                'dic': nota.dic if nota else None,
                'feb': nota.feb if nota else None,
                'mar': nota.mar if nota else None,
                'nota_final': nota.nota_final if nota else None,
                'definitiva': nota.nota_final if nota else None,
                'inasistencias': inasistencias,
            })

        return Response(result)

def _notificar_horario_curso(horario, remitente, creado=False, eliminado=False):
    accion_str = 'eliminado' if eliminado else ('creado' if creado else 'modificado')
    titulo = f"Horario {accion_str}: {horario.curso}"
    accion = 'eliminó' if eliminado else ('agregó' if creado else 'actualizó')
    cuerpo = f"Se {accion} el horario de {horario.materia.nombre} para {horario.curso}."
    alumnos = Alumno.objects.filter(año=horario.curso.año, division=horario.curso.division)
    familias_notificadas = set()
    for alumno in alumnos:
        if alumno.user:
            crear_y_notificar(
                usuario=alumno.user,
                tipo='sistema',
                titulo=titulo,
                cuerpo=cuerpo,
                remitente=remitente,
                metadata={'horario_id': horario.id},
            )
        for familia in alumno.familias.all():
            if familia.user and familia.user.id not in familias_notificadas:
                crear_y_notificar(
                    usuario=familia.user,
                    tipo='sistema',
                    titulo=titulo,
                    cuerpo=cuerpo,
                    remitente=remitente,
                    metadata={'horario_id': horario.id},
                )
                familias_notificadas.add(familia.user.id)

