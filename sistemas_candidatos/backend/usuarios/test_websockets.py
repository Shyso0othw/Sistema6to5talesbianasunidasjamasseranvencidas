"""Real ASGI consumers, isolated synthetic database and in-memory channel layer.

These tests deliberately do not certify Redis or multi-process deployment.
"""
from django.test import TransactionTestCase
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from usuarios import test_hardening as fixtures
from usuarios.models import Mensaje, GrupoChat
from backend.asgi import application


class WebSocketTests(TransactionTestCase):
    def setUp(self):
        fixtures.HardeningTests.setUpTestData()
        self.users = fixtures.HardeningTests.users
        self.token = str(AccessToken.for_user(self.users['admin']))

    def ws_client(self, query=None, origin='http://localhost'):
        return WebsocketCommunicator(application, '/ws/chat/?' + (query if query is not None else 'token='+self.token), headers=[(b'origin', origin.encode())])

    async def test_anonymous_rejected(self):
        client = self.ws_client('')
        self.assertFalse((await client.connect())[0])
        await client.disconnect()

    async def test_foreign_origin_rejected(self):
        client = self.ws_client(origin='https://foreign.invalid')
        self.assertFalse((await client.connect())[0])
        await client.disconnect()

    async def test_ping_and_invalid_shape(self):
        client = self.ws_client()
        self.assertTrue((await client.connect())[0])
        await client.send_json_to([])
        self.assertEqual((await client.receive_json_from())['type'], 'error')
        await client.send_json_to({'action':'ping'})
        self.assertEqual((await client.receive_json_from())['type'], 'pong')
        await client.disconnect()

    async def test_catch_up_over_200_with_group(self):
        def seed():
            group = GrupoChat.objects.create(nombre='Prueba de recuperación', creador=self.users['admin'])
            group.miembros.add(self.users['director'], self.users['secretario'])
            Mensaje.objects.bulk_create([Mensaje(remitente=self.users['director'], grupo=group, contenido=f'Mensaje {i}') for i in range(205)])
        await database_sync_to_async(seed)()
        client = self.ws_client('token='+self.token+'&last_message_id=0')
        self.assertTrue((await client.connect())[0])
        first = await client.receive_json_from()
        second = await client.receive_json_from()
        self.assertEqual(len(first['messages']), 200)
        self.assertEqual(len(second['messages']), 5)
        self.assertTrue(all(m['grupo_id'] for m in first['messages'] + second['messages']))
        await client.disconnect()

    async def test_disabled_account_rejected_on_reconnect(self):
        await database_sync_to_async(lambda: type(self.users['admin']).objects.filter(pk=self.users['admin'].pk).update(is_active=False))()
        client = self.ws_client()
        self.assertFalse((await client.connect())[0])
        await client.disconnect()

    async def test_notification_read_reaches_two_connections_and_action_survives(self):
        from channels.layers import get_channel_layer
        clients=[WebsocketCommunicator(application,'/ws/notifications/?token='+self.token,
                 headers=[(b'origin',b'http://localhost')]) for _ in range(2)]
        for client in clients:self.assertTrue((await client.connect())[0])
        layer=get_channel_layer()
        await layer.group_send(f'user_{self.users["admin"].pk}', {'type':'notification_read','notification_id':71})
        for client in clients:
            self.assertEqual(await client.receive_json_from(),{'type':'notification_read','notification_id':71})
        await layer.group_send(f'user_{self.users["admin"].pk}', {'type':'comunicado','comunicado':{'id':4},'action':'deleted'})
        for client in clients:
            self.assertEqual((await client.receive_json_from())['action'],'deleted')
            await client.send_json_to({'action':'ping'})
            self.assertEqual((await client.receive_json_from())['type'],'pong')
            await client.disconnect()
