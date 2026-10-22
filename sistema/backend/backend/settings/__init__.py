"""Explicit, validated environment selection."""
import os
from importlib import import_module
from django.core.exceptions import ImproperlyConfigured

environment = os.environ.get('DJANGO_ENV', 'development').strip().lower()
if environment not in {'development', 'staging', 'production'}:
    raise ImproperlyConfigured('DJANGO_ENV must be development, staging or production')
module = import_module(f'{__name__}.{environment}')
globals().update({name: getattr(module, name) for name in dir(module) if name.isupper()})
