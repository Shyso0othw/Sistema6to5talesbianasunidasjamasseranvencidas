"""
Script para reiniciar los datos del seed.
"""
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from usuarios.models import Rol, Perfil

print("Eliminando datos existentes...")
Perfil.objects.all().delete()
User.objects.all().delete()
Rol.objects.all().delete()
print("Datos eliminados correctamente.")

print("\nEjecutando seed.py...")
exec(open('seed.py', encoding='utf-8').read())
