"""HTTPS deployment behind the local Nginx proxy."""
from .deployed import *
if any(not origin.startswith('https://') for origin in CSRF_TRUSTED_ORIGINS + CORS_ALLOWED_ORIGINS):
    raise ImproperlyConfigured('Production origins must use HTTPS')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO','https')
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = required('EMAIL_HOST')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT','587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = required('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = required('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = required('DEFAULT_FROM_EMAIL')
