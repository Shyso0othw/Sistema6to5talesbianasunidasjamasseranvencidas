import asyncio
import json
import logging
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


def send_push_notification(usuario, titulo, cuerpo='', metadata=None):
    """Envía una notificación push al usuario vía API Web Push (Service Worker)."""
    if not getattr(settings, 'PUSH_SETTINGS', {}).get('VAPID_PRIVATE_KEY'):
        return
    try:
        from pywebpush import webpush, WebPushException
        from .models import PushSubscription

        subs = PushSubscription.objects.filter(usuario=usuario)
        if not subs.exists():
            return

        payload = json.dumps({
            'title': titulo,
            'body': cuerpo,
            'icon': '/favicon.svg',
            'badge': '/favicon.svg',
            'tag': 'sistema-dev',
            'data': metadata or {},
        })

        vapid_private = settings.PUSH_SETTINGS['VAPID_PRIVATE_KEY']
        vapid_claims = settings.PUSH_SETTINGS['VAPID_CLAIMS']

        for sub in subs:
            try:
                webpush(
                    subscription_info={
                        'endpoint': sub.endpoint,
                        'keys': {
                            'p256dh': sub.p256dh,
                            'auth': sub.auth,
                        }
                    },
                    data=payload,
                    vapid_private_key=vapid_private,
                    vapid_claims=dict(vapid_claims),
                    timeout=5,
                )
            except WebPushException as e:
                if e.response and e.response.status_code in (410, 404):
                    # Suscripción expirada o inválida, eliminar
                    sub.delete()
                else:
                    logger.warning("Push send failed for %s: %s", sub.endpoint[:60], e)
            except Exception as e:
                logger.warning("Push send error for %s: %s", sub.endpoint[:60], e)
    except ImportError:
        logger.warning("pywebpush no instalado - omitiendo push notification")
    except Exception as e:
        logger.error("send_push_notification error: %s", e)

_main_loop = None

def set_main_loop(loop):
    global _main_loop
    _main_loop = loop

def notify_group(group, payload):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    if _main_loop:
        asyncio.run_coroutine_threadsafe(
            channel_layer.group_send(group, payload),
            _main_loop
        )
    else:
        try:
            async_to_sync(channel_layer.group_send)(group, payload)
        except Exception as e:
            logger.error(f"notify_group(%s) failed: %s", group, e)

def _send_ws_to_user(user_id, payload):
    """Envía un mensaje WebSocket al grupo user_<id>"""
    notify_group(f'user_{user_id}', payload)


def _serializar_notificacion(notif, silent=False):
    return {
        'id': notif.id,
        'usuario': notif.usuario_id,
        'tipo': notif.tipo,
        'titulo': notif.titulo,
        'cuerpo': notif.cuerpo,
        'leido': notif.leido,
        'fecha_creacion': notif.fecha_creacion.isoformat(),
        'metadata': notif.metadata,
        'remitente': notif.remitente_id,
        'remitente_nombre': notif.remitente.get_full_name() or notif.remitente.username if notif.remitente else None,
        'remitente_username': notif.remitente.username if notif.remitente else None,
        'silent': silent,
        'pendiente': notif.pendiente,
    }


def crear_y_notificar(usuario, tipo, titulo, cuerpo='', remitente=None, metadata=None):
    """
    Crea una notificación en DB y la envía por WebSocket al usuario.
    - cuenta_activa=False: crea notificación con pendiente=True (bloqueada, no se entrega)
    - Tipo individual desactivado: entrega con silent=True (solo silencia sonido/alerta)
    - Todo activo: entrega normal
    Retorna la notificación creada.
    """
    from .models import Notificacion, NotificacionPreferencia

    silent = False
    pendiente = False
    try:
        pref = NotificacionPreferencia.objects.get(usuario=usuario)
        if not pref.cuenta_activa:
            pendiente = True
        else:
            tipo_pref_map = {
                'mensaje': 'notif_mensaje',
                'comunicado': 'notif_comunicado',
                'evento': 'notif_evento',
                'asistencia': 'notif_asistencia',
                'notas': 'notif_notas',
                'alumno': 'notif_alumno',
                'preceptor': 'notif_preceptor',
            }
            pref_field = tipo_pref_map.get(tipo)
            if pref_field and not getattr(pref, pref_field, True):
                silent = True
    except NotificacionPreferencia.DoesNotExist:
        pass

    notif = Notificacion.objects.create(
        usuario=usuario,
        tipo=tipo,
        titulo=titulo,
        cuerpo=cuerpo,
        remitente=remitente,
        metadata=metadata or {},
        pendiente=pendiente,
    )

    if pendiente:
        # Cuenta desactivada: almacenar sin entregar; se entregará al reactivar
        return notif

    notif_data = _serializar_notificacion(notif, silent=silent)

    _send_ws_to_user(usuario.id, {
        'type': 'notification',
        'notification': notif_data,
    })

    if not silent:
        try:
            send_push_notification(usuario, titulo, cuerpo, {'tipo': tipo, 'id': notif.id})
        except Exception:
            pass

    return notif


def entregar_pendientes(usuario):
    """Entrega todas las notificaciones pendientes de un usuario al reactivar su cuenta."""
    from .models import Notificacion

    pendientes = Notificacion.objects.filter(usuario=usuario, pendiente=True).order_by('fecha_creacion')
    if not pendientes.exists():
        return

    notifs_data = []
    for notif in pendientes:
        notif.pendiente = False
        notif.save(update_fields=['pendiente'])
        notifs_data.append(_serializar_notificacion(notif, silent=False))

    _send_ws_to_user(usuario.id, {
        'type': 'pending_notifications',
        'notifications': notifs_data,
    })


def notificar_notificacion_leida(usuario, notificacion_id):
    """Notifica al frontend que una notificación fue leída para que la remueva."""
    _send_ws_to_user(usuario.id, {
        'type': 'notification_read',
        'notification_id': notificacion_id,
    })
