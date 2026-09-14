"""Shared native deployment configuration. Credentials are supplied by systemd."""
from .base import *
from django.core.exceptions import ImproperlyConfigured
from urllib.parse import urlparse

def required(name):
    value = os.environ.get(name, '').strip()
    if not value or value.startswith('CHANGE_'):
        raise ImproperlyConfigured(f'{name} is required and must be configured')
    return value

SECRET_KEY = required('DJANGO_SECRET_KEY')
if len(SECRET_KEY) < 50 or len(set(SECRET_KEY)) < 5 or SECRET_KEY.startswith('django-insecure-'):
    raise ImproperlyConfigured('DJANGO_SECRET_KEY must be a strong randomly generated secret')
DEBUG = False
ALLOWED_HOSTS = [v.strip() for v in required('ALLOWED_HOSTS').split(',') if v.strip()]
if '*' in ALLOWED_HOSTS or any('ngrok' in host.lower() for host in ALLOWED_HOSTS):
    raise ImproperlyConfigured('Wildcard hosts and ngrok are not allowed in deployed environments')
DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
if DB_HOST not in {'127.0.0.1', 'localhost', '::1'}:
    raise ImproperlyConfigured('This native deployment requires local PostgreSQL')
DATABASES = {'default': {
    'ENGINE':'django.db.backends.postgresql', 'NAME':required('DB_NAME'),
    'USER':required('DB_USER'), 'PASSWORD':required('DB_PASSWORD'),
    'HOST':DB_HOST, 'PORT':os.environ.get('DB_PORT', '5432'), 'CONN_MAX_AGE':0,
}}
REDIS_URL = required('REDIS_URL')
redis = urlparse(REDIS_URL)
if redis.scheme not in {'redis','rediss'} or redis.hostname not in {'127.0.0.1','localhost','::1'}:
    raise ImproperlyConfigured('REDIS_URL must reference the local Redis service')
CHANNEL_LAYERS = {'default': {'BACKEND':'channels_redis.core.RedisChannelLayer','CONFIG':{'hosts':[REDIS_URL]}}}
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [v.strip() for v in os.environ.get('CORS_ALLOWED_ORIGINS','').split(',') if v.strip()]
CSRF_TRUSTED_ORIGINS = [v.strip() for v in required('CSRF_TRUSTED_ORIGINS').split(',') if v.strip()]
if '*' in ''.join(CORS_ALLOWED_ORIGINS + CSRF_TRUSTED_ORIGINS):
    raise ImproperlyConfigured('Origins must be explicit')
PUSH_SETTINGS = {
    'VAPID_PRIVATE_KEY':os.environ.get('VAPID_PRIVATE_KEY'),
    'VAPID_PUBLIC_KEY':os.environ.get('VAPID_PUBLIC_KEY'),
    'VAPID_CLAIMS':{'sub':os.environ.get('VAPID_SUBJECT','mailto:admin@example.invalid')},
}
PUSH_ALLOWED_HOSTS = {host.strip() for host in os.environ.get('PUSH_ALLOWED_HOSTS', '').split(',') if host.strip()}
if bool(PUSH_SETTINGS['VAPID_PRIVATE_KEY']) != bool(PUSH_SETTINGS['VAPID_PUBLIC_KEY']):
    raise ImproperlyConfigured('Configure both VAPID keys or neither')
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
STATIC_URL = '/static/'
MEDIA_URL = '/media/'
LOGGING['loggers']['usuarios']['level'] = 'INFO'
