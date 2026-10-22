"""
Django development settings for sistema-escolar project.

Loads .env file from project root for local development convenience.
In staging/production, environment variables are supplied by systemd EnvironmentFile.
"""

from .base import *

# Load .env file for local development (if exists)
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / '.env')

# SECURITY WARNING: keep the secret key used in production secret!
from django.core.exceptions import ImproperlyConfigured

def local_required(name):
    value = os.environ.get(name, '').strip()
    if not value or value.startswith('CHANGE_'):
        raise ImproperlyConfigured(f'{name} is required. See LOCAL_TESTING.md and backend/.env.example.')
    return value

SECRET_KEY = local_required('DJANGO_SECRET_KEY')
if os.environ.get('DB_ENGINE', 'django.db.backends.postgresql') != 'django.db.backends.postgresql':
    raise ImproperlyConfigured('Development requires PostgreSQL; use settings_test explicitly for isolated SQLite unit tests.')
# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Database - Use environment variables
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'postgres'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': local_required('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 0,
        'OPTIONS': {'sslmode': os.environ.get('DB_SSLMODE', 'require')},
    }
}

# CORS - Allow localhost for development
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
]

CORS_ALLOW_ALL_ORIGINS = False  # Only for development

# CSRF trusted origins for development
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
]

# Channels - InMemory for development (single process)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# VAPID - Use environment variables or placeholder for development
PUSH_SETTINGS = {
    'VAPID_PRIVATE_KEY': os.environ.get('VAPID_PRIVATE_KEY', ''),
    'VAPID_PUBLIC_KEY': os.environ.get('VAPID_PUBLIC_KEY', ''),
    'VAPID_CLAIMS': {'sub': 'mailto:admin@eestn1.edu.ar'},
}

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Security settings for development (relaxed)
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False