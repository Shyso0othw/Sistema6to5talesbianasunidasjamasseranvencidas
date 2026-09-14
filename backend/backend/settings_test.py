"""Isolated tests: never opens the configured school database."""
from .settings.base import *
SECRET_KEY = 'test-only-synthetic-key-not-for-a-deployment-0123456789'
DEBUG = False
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
PUSH_SETTINGS = {}
STATICFILES_DIRS = []
LOGGING = {}
