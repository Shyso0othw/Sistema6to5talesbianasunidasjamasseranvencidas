"""Private LAN/Tailscale staging only; external access is controlled by Nginx/firewall."""
from .deployed import *
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = 0
EMAIL_BACKEND = 'django.core.mail.backends.dummy.EmailBackend'
