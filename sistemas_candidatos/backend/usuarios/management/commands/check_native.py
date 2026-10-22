"""Read-only native deployment checks; never imports school data."""
import asyncio
import sys
import uuid
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.conf import settings
from channels.layers import get_channel_layer
from redis import Redis


class Command(BaseCommand):
    help = 'Verify Python 3.13, PostgreSQL 17 and actual Redis 8 channel delivery.'

    def handle(self, *args, **options):
        if sys.version_info[:2] != (3, 13):
            raise CommandError('El objetivo requiere Python 3.13.')
        if connection.vendor != 'postgresql':
            raise CommandError('Se requiere PostgreSQL; SQLite no certifica este despliegue.')
        with connection.cursor() as cursor:
            cursor.execute('SHOW server_version_num')
            version = int(cursor.fetchone()[0])
        if version // 10000 != 17:
            raise CommandError('El objetivo requiere PostgreSQL 17.')
        if settings.CHANNEL_LAYERS['default']['BACKEND'] != 'channels_redis.core.RedisChannelLayer':
            raise CommandError('La capa de canales debe ser Redis.')
        redis = Redis.from_url(settings.REDIS_URL, socket_connect_timeout=5, socket_timeout=5)
        try:
            if not redis.ping() or redis.info('server')['redis_version'].split('.')[0] != '8':
                raise CommandError('El objetivo requiere Redis 8.')
        finally:
            redis.close()

        async def probe():
            layer = get_channel_layer()
            channel = await layer.new_channel()
            group = 'validation.' + uuid.uuid4().hex
            try:
                await layer.group_add(group, channel)
                await layer.group_send(group, {'type':'validation', 'value':group})
                received = await asyncio.wait_for(layer.receive(channel), 5)
                if received.get('value') != group:
                    raise CommandError('Falló la entrega mediante Redis.')
            finally:
                await layer.group_discard(group, channel)
                await layer.close_pools()
        asyncio.run(probe())
        self.stdout.write(self.style.SUCCESS('Python 3.13, PostgreSQL 17 y entrega Redis 8 verificados. Falta certificar los flujos funcionales y el proxy.'))
