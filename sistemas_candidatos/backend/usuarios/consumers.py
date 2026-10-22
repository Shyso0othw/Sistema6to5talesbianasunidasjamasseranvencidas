import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework_simplejwt.tokens import AccessToken
from .models import Mensaje, GrupoChat
from .ws_utils import crear_y_notificar, set_main_loop
from .chat_network import can_chat

User = get_user_model()

# ChatConsumer: rastrea qué contacto está viendo cada usuario
# Notification delivery is durable and independent of per-process presence.


class JWTAuthMiddleware:
    """Valida JWT del query string y pone el user en el scope."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        params = {}
        for part in query_string.split('&'):
            if '=' in part:
                key, value = part.split('=', 1)
                params[key] = value

        token = params.get('token')
        if token:
            try:
                access = AccessToken(token)
                user = await database_sync_to_async(User.objects.get)(id=access['user_id'], is_active=True)
                scope['user'] = user
                scope['url_params'] = params
            except Exception:
                scope['user'] = None
                scope['url_params'] = params
        else:
            scope['user'] = None
            scope['url_params'] = params

        return await self.inner(scope, receive, send)


class ChatConsumer(AsyncWebsocketConsumer):
    """Maneja mensajes de chat en tiempo real."""

    async def connect(self):
        set_main_loop(asyncio.get_running_loop())
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated or not self.user.is_active:
            await self.close(code=4001)
            return

        self.user_group = f'user_{self.user.id}'
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()

        params = self.scope.get('url_params', {})
        last_id = params.get('last_message_id')
        if last_id:
            try:
                last_id = int(last_id)
                while True:
                    missed = await self._get_missed_messages(last_id)
                    if not missed:
                        break
                    await self.send(text_data=json.dumps({'type': 'catch_up', 'messages': missed}))
                    last_id = missed[-1]['id']
                    if len(missed) < 200:
                        break
            except (ValueError, TypeError):
                pass

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'JSON inválido'}))
            return

        if not isinstance(data, dict):
            await self.send(text_data=json.dumps({'type':'error','message':'Se esperaba un objeto JSON.'}))
            return
        current_user = await database_sync_to_async(lambda: User.objects.filter(pk=self.user.pk, is_active=True).first())()
        if current_user is None:
            await self.close(code=4001)
            return
        self.user = current_user
        content = data.get('contenido', '')
        if not isinstance(content, str) or len(content) > 10000:
            await self.send(text_data=json.dumps({'type':'error','message':'El mensaje debe tener hasta 10000 caracteres.'}))
            return
        action = data.get('action')

        try:
            if action == 'send_message':
                await self.handle_send_message(data)
            elif action == 'send_group_message':
                await self.handle_send_group_message(data)
            elif action == 'mark_read':
                await self.handle_mark_read(data)
            elif action == 'fetch_history':
                await self.handle_fetch_history(data)
            elif action == 'fetch_group_history':
                await self.handle_fetch_group_history(data)
            elif action in ('open_chat', 'close_chat'):
                pass
            elif action == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'No se pudo procesar la solicitud.',
            }))

    @database_sync_to_async
    def _get_missed_messages(self, last_id):
        from .chat_history import visible_messages
        from .serializers import MensajeSerializer
        qs = visible_messages(self.user).filter(pk__gt=last_id).select_related('remitente','destinatario','grupo').order_by('pk')[:200]
        return list(MensajeSerializer(qs, many=True).data)

    async def handle_send_message(self, data):
        try:
            destinatario_id = data.get('destinatario_id')
            contenido = data.get('contenido')

            if not destinatario_id or not contenido:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Faltan destinatario_id o contenido',
                }))
                return

            destinatario = await database_sync_to_async(User.objects.get)(id=destinatario_id)

            # Red de chat: no se permite enviar a usuarios con los que no se puede chatear
            if not await database_sync_to_async(can_chat)(self.user, destinatario):
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'No puedes enviar mensajes a este usuario según la red de chat',
                }))
                return

            mensaje = await database_sync_to_async(Mensaje.objects.create)(
                remitente=self.user,
                destinatario=destinatario,
                contenido=contenido,
            )

            mensaje_data = {
                'id': mensaje.id,
                'remitente': self.user.id,
                'remitente_username': self.user.username,
                'remitente_nombre': self.user.get_full_name() or self.user.username,
                'destinatario': destinatario.id,
                'destinatario_username': destinatario.username,
                'destinatario_nombre': destinatario.get_full_name() or destinatario.username,
                'contenido': mensaje.contenido,
                'leido': mensaje.leido,
                'fecha_creacion': mensaje.fecha_creacion.isoformat(),
            }

            await self.channel_layer.group_send(
                f'user_{destinatario.id}',
                {
                    'type': 'chat_message',
                    'message': mensaje_data,
                }
            )

            # Crear notificación en DB para el destinatario
            # Solo si no está viendo activamente este chat
            if True:  # Persist regardless of which process/tab is connected.
                await database_sync_to_async(crear_y_notificar)(
                    usuario=destinatario,
                    tipo='mensaje',
                    titulo=self.user.get_full_name() or self.user.username,
                    cuerpo=contenido[:200],
                    remitente=self.user,
                    metadata={'mensaje_id': mensaje.id},
                )

            mensaje_data['enviado_por_ws'] = True
            await self.send(text_data=json.dumps({
                'type': 'message_sent',
                'message': mensaje_data,
            }))

        except User.DoesNotExist:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Usuario destinatario no encontrado',
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error al enviar mensaje: {str(e)}',
            }))

    async def handle_mark_read(self, data):
        remitente_id = data.get('remitente_id')
        if not remitente_id:
            return

        updated = await database_sync_to_async(
            Mensaje.objects.filter(
                remitente_id=remitente_id,
                destinatario=self.user,
                leido=False
            ).update
        )(leido=True)

        # Notificar al remitente original que sus mensajes fueron leídos
        if updated > 0:
            await self.channel_layer.group_send(
                f'user_{remitente_id}',
                {
                    'type': 'read_receipt',
                    'read_by': self.user.id,
                    'count': updated,
                }
            )

    async def handle_fetch_history(self, data):
        from .chat_history import page_messages
        def load():
            if False:
                group = GrupoChat.objects.get(pk=data.get('grupo_id'))
                if group.creador_id != self.user.pk and not group.miembros.filter(pk=self.user.pk).exists():
                    raise ValueError('Grupo no autorizado.')
                qs = Mensaje.objects.filter(grupo=group)
            else:
                contact = User.objects.get(pk=data.get('contacto_id'), is_active=True)
                if not can_chat(self.user, contact):
                    raise ValueError('Contacto no autorizado.')
                qs = Mensaje.objects.filter(grupo__isnull=True).filter(Q(remitente=self.user,destinatario=contact)|Q(remitente=contact,destinatario=self.user))
            return page_messages(qs, data)
        try:
            rows, more = await database_sync_to_async(load)()
            await self.send(text_data=json.dumps({'type': 'history', 'grupo_id': data.get('grupo_id'), 'messages': rows, 'has_more': more}))
        except (User.DoesNotExist, GrupoChat.DoesNotExist, ValueError):
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Conversación no autorizada o inexistente.'}))

    async def handle_send_group_message(self, data):
        try:
            grupo_id = data.get('grupo_id')
            contenido = data.get('contenido')

            if not grupo_id or not contenido:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Faltan grupo_id o contenido',
                }))
                return

            grupo, miembro_ids = await self._get_grupo_and_members(grupo_id)
            if grupo is None:
                await self.send(text_data=json.dumps({'type': 'error', 'message': 'Grupo no encontrado'}))
                return

            if self.user.id not in miembro_ids and self.user.id != grupo.creador_id:
                await self.send(text_data=json.dumps({'type': 'error', 'message': 'No eres miembro de este grupo'}))
                return

            mensaje = await database_sync_to_async(Mensaje.objects.create)(
                remitente=self.user,
                grupo=grupo,
                contenido=contenido,
            )

            mensaje_data = {
                'id': mensaje.id,
                'grupo_id': grupo.id,
                'grupo_nombre': grupo.nombre,
                'remitente': self.user.id,
                'remitente_username': self.user.username,
                'remitente_nombre': self.user.get_full_name() or self.user.username,
                'contenido': mensaje.contenido,
                'leido': False,
                'fecha_creacion': mensaje.fecha_creacion.isoformat(),
            }

            all_recipients = set(miembro_ids) | {grupo.creador_id}
            for uid in all_recipients:
                if uid != self.user.id:

                    await self.channel_layer.group_send(
                        f'user_{uid}',
                        {'type': 'chat_message', 'message': mensaje_data}
                    )
                    
                    # Notificación DB
                    if True:  # Persist regardless of which process/tab is connected.
                        try:
                            dst_user = await database_sync_to_async(User.objects.get)(id=uid)
                            await database_sync_to_async(crear_y_notificar)(
                                usuario=dst_user,
                                tipo='mensaje',
                                titulo=grupo.nombre,
                                cuerpo=f"{self.user.get_full_name() or self.user.username}: {contenido[:150]}",
                                remitente=self.user,
                                metadata={'grupo_id': grupo.id, 'mensaje_id': mensaje.id},
                            )
                        except Exception as notif_e:
                            print(f"Error notifying group member {uid}: {notif_e}")

            mensaje_data['enviado_por_ws'] = True
            await self.send(text_data=json.dumps({'type': 'message_sent', 'message': mensaje_data}))

        except Exception as e:
            await self.send(text_data=json.dumps({'type': 'error', 'message': f'Error al enviar mensaje de grupo: {str(e)}'}))

    @database_sync_to_async
    def _get_grupo_and_members(self, grupo_id):
        try:
            grupo = GrupoChat.objects.get(id=grupo_id)
            miembro_ids = list(grupo.miembros.values_list('id', flat=True))
            return grupo, miembro_ids
        except GrupoChat.DoesNotExist:
            return None, []

    async def handle_fetch_group_history(self, data):
        from .chat_history import page_messages
        def load():
            if True:
                group = GrupoChat.objects.get(pk=data.get('grupo_id'))
                if group.creador_id != self.user.pk and not group.miembros.filter(pk=self.user.pk).exists():
                    raise ValueError('Grupo no autorizado.')
                qs = Mensaje.objects.filter(grupo=group)
            else:
                contact = User.objects.get(pk=data.get('contacto_id'), is_active=True)
                if not can_chat(self.user, contact):
                    raise ValueError('Contacto no autorizado.')
                qs = Mensaje.objects.filter(grupo__isnull=True).filter(Q(remitente=self.user,destinatario=contact)|Q(remitente=contact,destinatario=self.user))
            return page_messages(qs, data)
        try:
            rows, more = await database_sync_to_async(load)()
            await self.send(text_data=json.dumps({'type': 'group_history', 'grupo_id': data.get('grupo_id'), 'messages': rows, 'has_more': more}))
        except (User.DoesNotExist, GrupoChat.DoesNotExist, ValueError):
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Conversación no autorizada o inexistente.'}))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({'type': 'new_message', 'message': event['message']}))

    async def read_receipt(self, event):
        """Recibe notificación de lectura del channel layer y la envía al frontend."""
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'read_by': event['read_by'],
            'count': event.get('count', 0),
        }))

    # Handlers silenciosos para eventos de notificación que este consumer
    # recibe porque también está en el grupo user_<id>. Sin estos, Channels
    # lanza ValueError y corta la conexión WebSocket del chat.
    async def notification(self, event): pass
    async def comunicado(self, event): pass
    async def evento_update(self, event): pass
    async def alumno_created(self, event): pass
    async def preceptor_created(self, event): pass
    async def docente_created(self, event): pass
    async def asistencia_updated(self, event): pass
    async def familia_created(self, event): pass

    async def notification_read(self, event):
        # The other dedicated socket processes this event.
        return

    async def pending_notifications(self, event):
        # The other dedicated socket processes this event.
        return


class NotificationConsumer(AsyncWebsocketConsumer):
    """Maneja notificaciones de comunicados y eventos del calendario."""

    async def connect(self):
        set_main_loop(asyncio.get_running_loop())
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated or not self.user.is_active:
            await self.close(code=4001)
            return

        self.user_group = f'user_{self.user.id}'
        self.role_groups = []

        await self.channel_layer.group_add(self.user_group, self.channel_name)

        from .models import Perfil
        try:
            perfil = await database_sync_to_async(Perfil.objects.get)(user=self.user)
            roles = await database_sync_to_async(perfil.get_all_roles)()
            for rol in roles:
                group = f'role_{rol}'
                self.role_groups.append(group)
                await self.channel_layer.group_add(group, self.channel_name)
        except Perfil.DoesNotExist:
            pass

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
        for group in getattr(self, 'role_groups', []):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def comunicado(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_comunicado',
            'comunicado': event['comunicado'],
            'action': event.get('action', 'created'),
        }))

    async def evento_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'evento_update',
            'evento': event['evento'],
            'action': event.get('action', 'created'),
        }))

    async def notification(self, event):
        """Recibe una notificación unificada del channel layer y la envía al frontend."""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification'],
        }))

    async def alumno_created(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_alumno',
            'alumno': event['alumno'],
        }))

    async def preceptor_created(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_preceptor',
            'preceptor': event['preceptor'],
        }))

    async def docente_created(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_docente',
            'docente': event['docente'],
        }))

    async def asistencia_updated(self, event):
        await self.send(text_data=json.dumps({
            'type': 'asistencia_updated',
            'asistencia': event['asistencia'],
            'action': event.get('action', 'created'),
        }))

    async def familia_created(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_familia',
            'familia': event['familia'],
        }))

    async def notification_read(self, event):
        """Notifica al frontend que una notificación fue leída para removerla."""
        await self.send(text_data=json.dumps({
            'type': 'notification_read',
            'notification_id': event['notification_id'],
        }))

    async def chat_message(self, event):
        # The other dedicated socket processes this event.
        return

    async def read_receipt(self, event):
        # The other dedicated socket processes this event.
        return

    async def pending_notifications(self, event):
        await self.send(text_data=json.dumps({'type': 'pending_notifications', 'notifications': event.get('notifications', [])}))

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or '{}')
        except (TypeError, ValueError):
            return
        if not await database_sync_to_async(User.objects.filter(pk=self.user.pk, is_active=True).exists)():
            await self.close(code=4001)
            return
        if isinstance(data, dict) and data.get('action') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))
