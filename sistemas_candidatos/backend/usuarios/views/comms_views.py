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
from usuarios.audience import visible, receives
from usuarios.access import ScopedDetailMixin
from usuarios.serializers import *
from usuarios.ws_utils import *
from usuarios.chat_network import can_chat, can_chat_group
from usuarios.permissions import (
    CanCreateEvent, CanEditEvent, CanDeleteEvent, CanManageComunicados,
    CanManageAcademic, CanManageHorarios, CanManageLibrary,
)

class EventoListCreateView(generics.ListCreateAPIView):
    queryset = Evento.objects.all().order_by('fecha', 'hora_inicio')
    serializer_class = EventoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanCreateEvent()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        perfil = getattr(user, 'perfil', None)
        if not perfil:
            raise PermissionDenied('Usuario no autorizado.')

        # Determinar el tipo de evento basado en el rol principal o el primero permitido
        rol_para_tipo = perfil.rol.nombre
        ROLE_TYPE_MAP = {
            'admin': 'admin', 'secretario': 'admin', 'secretaria': 'admin',
            'director': 'admin', 'directivo': 'admin', 'jefe_area': 'admin',
            'preceptor': 'preceptor', 'jefe_preceptores': 'preceptor',
            'j_preceptores': 'preceptor', 'profesor': 'docente',
            'jefe_departamento': 'docente',
        }
        tipo = ROLE_TYPE_MAP.get(rol_para_tipo, 'otro')
        # Serialize submissions by creator, including concurrent requests in PostgreSQL.
        # Exact duplicate events are rejected rather than producing duplicate notifications.
        with transaction.atomic():
            User.objects.select_for_update().get(pk=user.pk)
            values = dict(serializer.validated_data)
            for field in Evento._meta.concrete_fields:
                if field.name not in values and field.name not in {'id', 'creado_por', 'tipo'}:
                    values[field.name] = field.get_default()
            if Evento.objects.filter(creado_por=user, tipo=tipo, **values).exists():
                raise serializers.ValidationError('Ya existe este evento. Revise el calendario antes de repetir el envío.')
            evento = serializer.save(creado_por=user, tipo=tipo)
            transaction.on_commit(lambda: self._notificar_evento(evento, 'created'))

    def _notificar_evento(self, evento, action):
        notificar_evento(evento, action, getattr(self, 'request', None))

    def get_queryset(self):
        return visible(self.request.user, Evento).order_by('-pk')

class EventoUpdateView(generics.UpdateAPIView):
    queryset = Evento.objects.all()
    serializer_class = EventoSerializer
    permission_classes = [CanEditEvent]

    def perform_update(self, serializer):
        user = self.request.user
        perfil = getattr(user, 'perfil', None)
        evento = self.get_object()

        if not perfil and not user.is_superuser:
            raise PermissionDenied('No autorizado.')

        if not user.is_superuser:
            user_roles = perfil.get_all_roles()
            is_admin = any(r in ['admin', 'secretaria', 'secretario', 'director', 'vicedirector', 'directivo'] for r in user_roles)

            if not is_admin and evento.creado_por != user:
                raise PermissionDenied('No tienes permisos para modificar eventos que no creaste.')

        with transaction.atomic():
            previous = audience_ids(evento)
            evento = serializer.save()
            transaction.on_commit(lambda: revoke_audience(evento, previous, 'evento'))
            transaction.on_commit(lambda: self._notificar_evento(evento, 'updated'))

    def _notificar_evento(self, evento, action):
        notificar_evento(evento, action, getattr(self, 'request', None))

    def get_queryset(self):
        return visible(self.request.user, Evento).order_by('-pk')

class EventoDeleteView(generics.DestroyAPIView):
    queryset = Evento.objects.all()
    permission_classes = [CanDeleteEvent]

    def perform_destroy(self, instance):
        from usuarios.access import administrative
        if not administrative(self.request.user) and instance.creado_por_id != self.request.user.pk:
            raise PermissionDenied('Solo puede eliminar eventos propios.')
        notificar_evento(instance, 'deleted', self.request)
        instance.delete()

    def get_queryset(self):
        return visible(self.request.user, Evento).order_by('-pk')

class ComunicadoListCreateView(generics.ListCreateAPIView):
    """Listar y crear comunicados"""
    serializer_class = ComunicadoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageComunicados()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return visible(self.request.user, Comunicado).order_by('-pk')

    def perform_create(self, serializer):
        user = self.request.user
        perfil = getattr(user, 'perfil', None)

        if not perfil:
            raise PermissionDenied('Usuario no autorizado para crear comunicados.')

        user_roles = perfil.get_all_roles()

        # Verificar permisos básicos usando CanManageComunicados
        allowed = {'preceptor', 'director', 'vicedirector', 'directivo', 'admin', 'secretario', 'secretaria',
                   'profesor', 'jefe_area', 'jefe_preceptores', 'jefe_departamento'}
        if not any(role in allowed for role in user_roles):
            raise PermissionDenied('No estás autorizado para crear comunicados.')

        # Obtener datos del request
        data = serializer.validated_data
        tipo_destinatario = data.get('tipo_destinatario', 'Todos')
        cursos_seleccionados = data.get('cursos_seleccionados', [])

        # Restricción para docentes: solo pueden enviar a cursos a su cargo
        is_docente = any(role in {'profesor', 'jefe_area', 'jefe_departamento'} for role in user_roles)

        if is_docente:
            # Verificar que el docente solo pueda enviar a sus cursos asignados
            if tipo_destinatario == 'CursosEspecificos' and cursos_seleccionados:
                docente_cursos = set()
                if hasattr(user, 'docente'):
                    docente_cursos = {f"{m.curso.año}° {m.curso.division}" for m in user.docente.materias.all() if m.curso}
                cursos_no_permitidos = set(cursos_seleccionados) - docente_cursos
                if cursos_no_permitidos:
                    raise PermissionDenied(f'No puedes enviar comunicados a cursos que no te pertenecen: {", ".join(cursos_no_permitidos)}')

        # Establecer fecha de publicación si no viene
        if not data.get('fecha_publicacion'):
            from django.utils import timezone
            data['fecha_publicacion'] = timezone.now().date()

        comunicado = serializer.save(creado_por=user)
        self._notificar_comunicado(comunicado)

    def _notificar_comunicado(self, comunicado):
        notificar_comunicado(comunicado)

class ComunicadoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Obtener, actualizar o eliminar un comunicado"""
    queryset = Comunicado.objects.all()
    serializer_class = ComunicadoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [CanManageComunicados()]
        return [permissions.IsAuthenticated()]

    def perform_update(self, serializer):
        user = self.request.user
        comunicado = self.get_object()

        if comunicado.creado_por != user and not user.is_superuser:
            try:
                perfil = user.perfil
                user_roles = perfil.get_all_roles()
                if not any(r in ['admin', 'director', 'vicedirector', 'directivo', 'secretario', 'secretaria'] for r in user_roles):
                    raise PermissionDenied('No tienes permiso para modificar este comunicado.')
            except Exception:
                raise PermissionDenied('No tienes permiso para modificar este comunicado.')

        with transaction.atomic():
            previous = audience_ids(comunicado)
            comunicado = serializer.save()
            transaction.on_commit(lambda: revoke_audience(comunicado, previous, 'comunicado'))
            transaction.on_commit(lambda: notificar_comunicado(comunicado, action='updated'))

    def perform_destroy(self, instance):
        from usuarios.access import administrative
        if not administrative(self.request.user) and instance.creado_por_id != self.request.user.pk:
            raise PermissionDenied('Solo puede eliminar comunicados propios.')
        notificar_comunicado(instance, 'deleted')
        instance.delete()

    def get_queryset(self):
        return visible(self.request.user, Comunicado).order_by('-pk')

class ConversacionView(APIView):
    """Obtiene todos los mensajes entre dos usuarios"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, usuario_id):
        from usuarios.chat_history import page_messages
        contact = get_object_or_404(User, pk=usuario_id, is_active=True)
        if not can_chat(request.user, contact):
            raise PermissionDenied('No puede acceder a esta conversación.')
        qs = Mensaje.objects.filter(grupo__isnull=True).filter(Q(remitente=request.user, destinatario=contact)|Q(remitente=contact,destinatario=request.user))
        rows, more = page_messages(qs, request.query_params)
        return Response(rows, headers={'X-Has-More': str(more).lower()})

class EnviarMensajeView(generics.CreateAPIView):
    """Crear/enviar un mensaje"""
    serializer_class = MensajeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(remitente=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        grupo = serializer.validated_data.get('grupo')
        destinatario = serializer.validated_data.get('destinatario')
        if grupo:
            if destinatario or not (grupo.creador_id == request.user.pk or grupo.miembros.filter(pk=request.user.pk).exists()):
                raise PermissionDenied('Grupo no autorizado o destino ambiguo.')
        elif not destinatario or not destinatario.is_active or not can_chat(request.user, destinatario):
            raise PermissionDenied('Destinatario no autorizado.')
        self.perform_create(serializer)
        ids = set(grupo.miembros.values_list('pk', flat=True)) | {grupo.creador_id} if grupo else {destinatario.pk}
        for user_id in ids | {request.user.pk}:
            notify_group(f'user_{user_id}', {'type': 'chat.message', 'message': serializer.data})
        return Response(serializer.data, status=201)

class GrupoChatListCreateView(generics.ListCreateAPIView):
    """Listar y crear grupos de chat"""
    serializer_class = GrupoChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return GrupoChat.objects.filter(
            Q(creador=user) | Q(miembros=user)
        ).distinct().order_by('-fecha_creacion')

    def perform_create(self, serializer):
        user = self.request.user
        try:
            perfil = user.perfil
            user_roles = perfil.get_all_roles()
        except Exception:
            user_roles = []

        allowed_creation_roles = {'admin', 'jefe_area', 'jefe_departamento', 'jefe_preceptores'}

        if not any(role in allowed_creation_roles for role in user_roles):
            raise PermissionDenied('No estás autorizado para crear grupos de chat.')

        # Red de chat: un grupo no puede romper las restricciones de la red.
        # El creador debe poder chatear con cada miembro; los miembros entre sí (mutuo).
        miembros = list(serializer.validated_data.get('miembros', []))
        if not can_chat_group(user, miembros):
            raise PermissionDenied('No se puede crear el grupo: algunos integrantes no pueden chatear entre sí según la red de chat.')

        serializer.save(creador=user)

class GrupoConversacionView(APIView):
    """Obtiene los mensajes de un grupo de chat"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, grupo_id):
        from usuarios.chat_history import page_messages
        grupo = get_object_or_404(GrupoChat, pk=grupo_id)
        if grupo.creador_id != request.user.pk and not grupo.miembros.filter(pk=request.user.pk).exists():
            raise PermissionDenied('No pertenece a este grupo.')
        rows, more = page_messages(Mensaje.objects.filter(grupo=grupo), request.query_params)
        return Response(rows, headers={'X-Has-More': str(more).lower()})

class NotificacionListView(generics.ListAPIView):
    """Lista las notificaciones del usuario autenticado"""
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Excluir pendientes (generadas mientras cuenta desactivada) hasta que se reactiven
        return Notificacion.objects.filter(usuario=self.request.user, leido=False, pendiente=False)

class NotificacionLeerView(APIView):
    """Marca una notificación como leída"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notificacion.objects.get(id=pk, usuario=request.user)
            notif.leido = True
            notif.save(update_fields=['leido'])
            from ..ws_utils import notificar_notificacion_leida
            notificar_notificacion_leida(request.user, notif.id)
            return Response({'status': 'ok'})
        except Notificacion.DoesNotExist:
            return Response({'error': 'Notificación no encontrada'}, status=404)

class NotificacionLeerTodasView(APIView):
    """Marca todas las notificaciones del usuario como leídas"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        notificaciones = Notificacion.objects.filter(usuario=request.user, leido=False, pendiente=False)
        ids = list(notificaciones.values_list('id', flat=True))
        actualizados = notificaciones.update(leido=True)
        from ..ws_utils import notificar_notificacion_leida
        for nid in ids:
            notificar_notificacion_leida(request.user, nid)
        return Response({'status': 'ok', 'actualizados': actualizados})

    def patch(self, request):
        return self.post(request)

class NotificacionDeleteView(APIView):
    """Elimina una notificación"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            notif = Notificacion.objects.get(id=pk, usuario=request.user)
            if notif.pendiente:
                return Response({'error': 'No se puede eliminar una notificación pendiente'}, status=400)
            notif.delete()
            return Response({'status': 'ok'}, status=204)
        except Notificacion.DoesNotExist:
            return Response({'error': 'Notificación no encontrada'}, status=404)

class NotificacionLimpiarView(APIView):
    """Elimina todas las notificaciones leídas del usuario"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        eliminados, _ = Notificacion.objects.filter(usuario=request.user, leido=True).delete()
        return Response({'status': 'ok', 'eliminados': eliminados}, status=204)

class NotificacionPreferenciaView(APIView):
    """Obtiene o actualiza las preferencias de notificación del usuario"""
    permission_classes = [permissions.IsAuthenticated]

    def get_or_create_prefs(self, user):
        pref, created = NotificacionPreferencia.objects.get_or_create(usuario=user)
        return pref

    def get(self, request):
        pref = self.get_or_create_prefs(request.user)
        return Response(NotificacionPreferenciaSerializer(pref).data)

    def put(self, request):
        pref = self.get_or_create_prefs(request.user)
        old_active = pref.cuenta_activa
        serializer = NotificacionPreferenciaSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Si se reactivó la cuenta, entregar notificaciones pendientes
            if not old_active and pref.cuenta_activa:
                from ..ws_utils import entregar_pendientes
                entregar_pendientes(request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class PushSubscriptionView(APIView):
    """Registra o actualiza una suscripción push del navegador/OS"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.conf import settings
        return Response({'public_key': settings.PUSH_SETTINGS.get('VAPID_PUBLIC_KEY') or None})

    def post(self, request):
        endpoint = request.data.get('endpoint')
        p256dh = request.data.get('keys', {}).get('p256dh')
        auth = request.data.get('keys', {}).get('auth')
        if not endpoint or not p256dh or not auth:
            return Response({'error': 'endpoint, keys.p256dh y keys.auth son requeridos'}, status=400)
        from urllib.parse import urlparse
        from django.conf import settings
        try:
            destination = urlparse(endpoint)
            allowed = getattr(settings, 'PUSH_ALLOWED_HOSTS', set())
            valid = (destination.scheme == 'https' and destination.hostname in allowed
                     and not destination.username and not destination.password
                     and destination.port in (None, 443))
        except (TypeError, ValueError):
            valid = False
        if not valid:
            return Response({'error':'Servidor push no autorizado.'}, status=400)
        sub, created = PushSubscription.objects.update_or_create(
            usuario=request.user,
            endpoint=endpoint,
            defaults={
                'p256dh': p256dh,
                'auth': auth,
                'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500],
            }
        )
        return Response({'status': 'ok', 'created': created})

    def delete(self, request):
        endpoint = request.data.get('endpoint')
        if not endpoint:
            # Eliminar todas las suscripciones del usuario
            cnt, _ = PushSubscription.objects.filter(usuario=request.user).delete()
            return Response({'status': 'ok', 'eliminadas': cnt}, status=204)
        cnt, _ = PushSubscription.objects.filter(usuario=request.user, endpoint=endpoint).delete()
        return Response({'status': 'ok', 'eliminadas': cnt}, status=204)

class DashboardStatsView(APIView):
    """Devuelve estadísticas generales para los dashboards del frontend"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        first_of_month = today.replace(day=1)

        total_alumnos = Alumno.objects.count()
        total_profesores = Docente.objects.count()
        total_preceptores = Preceptor.objects.count()
        total_familias = Familia.objects.count()
        total_cursos = Curso.objects.filter(activo=True).count()
        comunicados_mes = Comunicado.objects.filter(fecha__date__gte=first_of_month).count()

        # Staff counts
        staff_counts = {
            'directivo': 0, 'secretaria': 0, 'auxiliar': 0,
            'bibliotecario': 0, 'eoe': 0, 'ematp': 0,
            'jefe_preceptores': 0, 'jefe_area': 0, 'jefe_departamento': 0
        }
        from usuarios.permissions import get_user_roles
        for account in User.objects.filter(is_active=True, perfil__isnull=False).distinct():
            roles = get_user_roles(account)
            aliases = {'director':'directivo', 'vicedirector':'directivo', 'secretario':'secretaria'}
            for role in {aliases.get(r,r) for r in roles}:
                if role in staff_counts:
                    staff_counts[role] += 1

        # Asistencia
        from usuarios.access import academic_scope
        daily = academic_scope(request.user, AsistenciaDiaria).filter(fecha=timezone.localdate())
        total_asistencias = daily.count()
        total_presentes = daily.filter(estado='Presente').count()
        asistencia_hoy_pct = round(total_presentes / total_asistencias * 100) if total_asistencias else 0
        # Alertas
        alertas_count = academic_scope(request.user, Asistencia).filter(ausentes__gt=10).values('estudiante').distinct().count()

        # Actividad reciente (últimos comunicados y eventos)
        actividad_reciente = []
        recent_comunicados = visible(request.user, Comunicado).order_by('-fecha')[:5]
        for c in recent_comunicados:
            actividad_reciente.append({
                'id': f'c_{c.id}',
                'tipo': 'message',
                'texto': f'Comunicado "{c.titulo}" enviado',
                'fecha_obj': c.fecha
            })

        recent_eventos = visible(request.user, Evento).order_by('-id')[:3]
        import datetime
        for i, e in enumerate(recent_eventos):
            # Usar timezone.now para simular cuándo se creó, ya que Evento solo tiene la fecha del evento
            fecha_creacion = timezone.make_aware(datetime.datetime.combine(e.fecha, datetime.time.min))
            actividad_reciente.append({
                'id': f'e_{e.id}',
                'tipo': 'calendar',
                'texto': f'Evento "{e.titulo}" ({e.fecha.strftime("%d/%m")})',
                'fecha_obj': fecha_creacion
            })

        actividad_reciente.sort(key=lambda x: x['fecha_obj'], reverse=True)
        actividad_formatted = []
        for act in actividad_reciente[:7]:
            now = timezone.now()
            diff = now - act['fecha_obj']
            if diff.days == 0:
                if diff.seconds < 3600:
                    tiempo = f"Hace {diff.seconds // 60} min"
                else:
                    tiempo = f"Hace {diff.seconds // 3600} horas"
            elif diff.days == 1:
                tiempo = "Ayer"
            else:
                tiempo = f"Hace {diff.days} días"

            actividad_formatted.append({
                'id': act['id'],
                'tipo': act['tipo'],
                'texto': act['texto'],
                'tiempo': act['fecha_obj'].strftime('%d/%m/%Y') if act['tipo'] == 'calendar' else tiempo
            })

        # Carreras stats
        carreras_stats = {}
        alumnos_all = Alumno.objects.all()
        cursos_all = Curso.objects.all()

        # Mapear año-división a carrera
        curso_carrera_map = {}
        for c in cursos_all:
            if c.orientacion:
                carrera = c.orientacion.nombre
            elif c.año <= 3:
                carrera = 'Ciclo Básico'
            else:
                carrera = c.carrera or 'Sin Especificar'
            curso_carrera_map[f"{c.año}-{c.division}"] = carrera

        for a in alumnos_all:
            key = f"{a.año}-{a.division}"
            if key in curso_carrera_map:
                carrera = curso_carrera_map[key]
            else:
                if a.año <= 3:
                    carrera = 'Ciclo Básico'
                else:
                    carrera = 'Sin Especificar'

            if carrera not in carreras_stats:
                carreras_stats[carrera] = 0
            carreras_stats[carrera] += 1

        # Formato para el frontend
        carreras_list = [{'nombre': k, 'cantidad': v} for k, v in carreras_stats.items()]
        carreras_list.sort(key=lambda x: x['cantidad'], reverse=True)

        return Response({
            'total_alumnos': total_alumnos,
            'total_profesores': total_profesores,
            'total_preceptores': total_preceptores,
            'total_familias': total_familias,
            'total_directivos': staff_counts['directivo'],
            'total_secretaria': staff_counts['secretaria'],
            'total_auxiliares': staff_counts['auxiliar'],
            'total_bibliotecarios': staff_counts['bibliotecario'],
            'total_eoe': staff_counts['eoe'],
            'total_ematp': staff_counts['ematp'],
            'total_jefe_preceptores': staff_counts['jefe_preceptores'],
            'total_jefe_area': staff_counts['jefe_area'],
            'total_jefe_departamento': staff_counts['jefe_departamento'],
            'total_cursos': total_cursos,
            'comunicados_mes': comunicados_mes,
            'asistencia_hoy': f"{asistencia_hoy_pct}%",
            'alertas_count': alertas_count,
            'actividad': actividad_formatted,
            'carreras': carreras_list
        })

def notificar_evento(evento, action, request=None):
    data = {'id': evento.pk} if action == 'deleted' else EventoSerializer(evento).data
    for user in User.objects.filter(is_active=True):
        if not receives(user, evento):
            continue
        notify_group(f'user_{user.pk}', {'type': 'evento.update', 'evento': data, 'action': action})
        if action == 'deleted':
            Notificacion.objects.filter(usuario=user, metadata__evento_id=evento.pk).delete()
        else:
            crear_y_notificar(user, 'evento', evento.titulo, (evento.descripcion or '')[:200],
                             remitente=getattr(request, 'user', None), metadata={'evento_id': evento.pk, 'action': action})

def notificar_comunicado(comunicado, action='created'):
    data = {'id': comunicado.pk} if action == 'deleted' else ComunicadoSerializer(comunicado).data
    for user in User.objects.filter(is_active=True):
        if not receives(user, comunicado):
            continue
        notify_group(f'user_{user.pk}', {'type': 'comunicado', 'comunicado': data, 'action': action})
        if action == 'deleted':
            Notificacion.objects.filter(usuario=user, metadata__comunicado_id=comunicado.pk).delete()
        else:
            crear_y_notificar(user, 'comunicado', comunicado.titulo, comunicado.cuerpo[:200],
                             remitente=comunicado.creado_por, metadata={'comunicado_id': comunicado.pk, 'action': action})


def audience_ids(obj):
    return {u.pk for u in User.objects.filter(is_active=True) if receives(u, obj)}


def revoke_audience(obj, previous, kind):
    """Remove stale recipient state without broadcasting the new private content."""
    for user_id in previous - audience_ids(obj):
        Notificacion.objects.filter(usuario_id=user_id, **{f'metadata__{kind}_id': obj.pk}).delete()
        notify_group(f'user_{user_id}', {
            'type': 'evento.update' if kind == 'evento' else 'comunicado',
            kind: {'id': obj.pk}, 'action': 'deleted',
        })
