import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, r'c:\Users\Usuario\sistema\backend')
import django
django.setup()

from django.contrib.auth.models import User
from usuarios.models import Rol, Perfil

# multirol10: Ana Multirol (familia + preceptor)
user_m1, created_m1 = User.objects.get_or_create(
    username='multirol10',
    defaults={'first_name': 'Ana', 'last_name': 'Multirol'}
)
if created_m1:
    user_m1.set_password('multirol10')
    user_m1.save()
    print("  Usuario 'multirol10' (Ana Multirol) -> CREADO")
else:
    print("  Usuario 'multirol10' (Ana Multirol) -> ya existia")

rol_familia = Rol.objects.get(nombre='familia')
rol_preceptor = Rol.objects.get(nombre='preceptor')
perfil_m1, cp_m1 = Perfil.objects.get_or_create(user=user_m1, defaults={'rol': rol_familia})
perfil_m1.roles.set([rol_familia, rol_preceptor])
print(f"  Perfil multirol10 -> roles: {perfil_m1.get_all_roles()}")

# multirol20: Pedro Multirol (admin + jefe_area)
user_m2, created_m2 = User.objects.get_or_create(
    username='multirol20',
    defaults={'first_name': 'Pedro', 'last_name': 'Multirol'}
)
if created_m2:
    user_m2.set_password('multirol20')
    user_m2.save()
    print("  Usuario 'multirol20' (Pedro Multirol) -> CREADO")
else:
    print("  Usuario 'multirol20' (Pedro Multirol) -> ya existia")

rol_admin = Rol.objects.get(nombre='admin')
rol_jefe_area = Rol.objects.get(nombre='jefe_area')
perfil_m2, cp_m2 = Perfil.objects.get_or_create(user=user_m2, defaults={'rol': rol_admin})
perfil_m2.roles.set([rol_admin, rol_jefe_area])
print(f"  Perfil multirol20 -> roles: {perfil_m2.get_all_roles()}")

print("\n=== MULTIROL SEED DONE ===")
