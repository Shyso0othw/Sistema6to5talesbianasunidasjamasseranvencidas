"""
Script para insertar roles y usuarios de prueba en la base de datos.
Ejecutar con: python manage.py shell < seed.py
"""
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from usuarios.models import Rol, Perfil

# --- Crear los 14 roles ---
roles = [
    'estudiante', 'preceptor', 'admin', 'profesor', 'familia',
    'director', 'secretario', 'jefe_area', 'jefe_departamento',
    'jefe_preceptores', 'ematp', 'EOE', 'bibliotecario', 'auxiliar'
]
for nombre in roles:
    rol, created = Rol.objects.get_or_create(nombre=nombre)
    estado = 'CREADO' if created else 'ya existia'
    print(f"  Rol '{nombre}' -> {estado}")

print()

# --- Usuarios originales ---

# Juan Gimenez (estudiante)
user1, created1 = User.objects.get_or_create(
    username='juan1234',
    defaults={'first_name': 'Juan', 'last_name': 'Gimenez'}
)
if created1:
    user1.set_password('juan1234')
    user1.save()
    print("  Usuario 'juan1234' (Juan Gimenez) -> CREADO")
else:
    print("  Usuario 'juan1234' (Juan Gimenez) -> ya existia")
perfil1, cp1 = Perfil.objects.get_or_create(user=user1, defaults={'rol': Rol.objects.get(nombre='estudiante')})
print(f"  Perfil juan1234 -> rol 'estudiante' -> {'ASIGNADO' if cp1 else 'ya existia'}")
print()

# Pablo Perez (preceptor)
user2, created2 = User.objects.get_or_create(
    username='blito4321',
    defaults={'first_name': 'Pablo', 'last_name': 'Perez'}
)
if created2:
    user2.set_password('blito4321')
    user2.save()
    print("  Usuario 'blito4321' (Pablo Perez) -> CREADO")
else:
    print("  Usuario 'blito4321' (Pablo Perez) -> ya existia")
perfil2, cp2 = Perfil.objects.get_or_create(user=user2, defaults={'rol': Rol.objects.get(nombre='preceptor')})
print(f"  Perfil blito4321 -> rol 'preceptor' -> {'ASIGNADO' if cp2 else 'ya existia'}")
print()

# Carlos Ramirez (admin)
user3, created3 = User.objects.get_or_create(
    username='admin01',
    defaults={'first_name': 'Carlos', 'last_name': 'Ramirez'}
)
if created3:
    user3.set_password('admin01')
    user3.save()
    print("  Usuario 'admin01' (Carlos Ramirez) -> CREADO")
else:
    print("  Usuario 'admin01' (Carlos Ramirez) -> ya existia")
perfil3, cp3 = Perfil.objects.get_or_create(user=user3, defaults={'rol': Rol.objects.get(nombre='admin')})
print(f"  Perfil admin01 -> rol 'admin' -> {'ASIGNADO' if cp3 else 'ya existia'}")
print()

# Laura Garcia (profesor)
user4, created4 = User.objects.get_or_create(
    username='profe01',
    defaults={'first_name': 'Laura', 'last_name': 'Garcia'}
)
if created4:
    user4.set_password('profe01')
    user4.save()
    print("  Usuario 'profe01' (Laura Garcia) -> CREADO")
else:
    print("  Usuario 'profe01' (Laura Garcia) -> ya existia")
perfil4, cp4 = Perfil.objects.get_or_create(user=user4, defaults={'rol': Rol.objects.get(nombre='profesor')})
print(f"  Perfil profe01 -> rol 'profesor' -> {'ASIGNADO' if cp4 else 'ya existia'}")
print()

# Maria Gonzalez (familia)
user5, created5 = User.objects.get_or_create(
    username='familia01',
    defaults={'first_name': 'Maria', 'last_name': 'Gonzalez'}
)
if created5:
    user5.set_password('familia01')
    user5.save()
    print("  Usuario 'familia01' (Maria Gonzalez) -> CREADO")
else:
    print("  Usuario 'familia01' (Maria Gonzalez) -> ya existia")
perfil5, cp5 = Perfil.objects.get_or_create(user=user5, defaults={'rol': Rol.objects.get(nombre='familia')})
print(f"  Perfil familia01 -> rol 'familia' -> {'ASIGNADO' if cp5 else 'ya existia'}")
print()

# --- Usuarios nuevos ---

# Marcelo Fernández (director)
user6, created6 = User.objects.get_or_create(
    username='director01',
    defaults={'first_name': 'Marcelo', 'last_name': 'Fernández'}
)
if created6:
    user6.set_password('director01')
    user6.save()
    print("  Usuario 'director01' (Marcelo Fernández) -> CREADO")
else:
    print("  Usuario 'director01' (Marcelo Fernández) -> ya existia")
perfil6, cp6 = Perfil.objects.get_or_create(user=user6, defaults={'rol': Rol.objects.get(nombre='director')})
print(f"  Perfil director01 -> rol 'director' -> {'ASIGNADO' if cp6 else 'ya existia'}")
print()

# Valeria Sosa (secretario)
user7, created7 = User.objects.get_or_create(
    username='secretario01',
    defaults={'first_name': 'Valeria', 'last_name': 'Sosa'}
)
if created7:
    user7.set_password('secretario01')
    user7.save()
    print("  Usuario 'secretario01' (Valeria Sosa) -> CREADO")
else:
    print("  Usuario 'secretario01' (Valeria Sosa) -> ya existia")
perfil7, cp7 = Perfil.objects.get_or_create(user=user7, defaults={'rol': Rol.objects.get(nombre='secretario')})
print(f"  Perfil secretario01 -> rol 'secretario' -> {'ASIGNADO' if cp7 else 'ya existia'}")
print()

# Roberto Villalba (jefe_area)
user8, created8 = User.objects.get_or_create(
    username='jefedearea01',
    defaults={'first_name': 'Roberto', 'last_name': 'Villalba'}
)
if created8:
    user8.set_password('jefedearea01')
    user8.save()
    print("  Usuario 'jefedearea01' (Roberto Villalba) -> CREADO")
else:
    print("  Usuario 'jefedearea01' (Roberto Villalba) -> ya existia")
perfil8, cp8 = Perfil.objects.get_or_create(user=user8, defaults={'rol': Rol.objects.get(nombre='jefe_area')})
print(f"  Perfil jefedearea01 -> rol 'jefe_area' -> {'ASIGNADO' if cp8 else 'ya existia'}")
print()

# Claudia Moreno (jefe_departamento)
user9, created9 = User.objects.get_or_create(
    username='jefededepartamento01',
    defaults={'first_name': 'Claudia', 'last_name': 'Moreno'}
)
if created9:
    user9.set_password('jefededepartamento01')
    user9.save()
    print("  Usuario 'jefededepartamento01' (Claudia Moreno) -> CREADO")
else:
    print("  Usuario 'jefededepartamento01' (Claudia Moreno) -> ya existia")
perfil9, cp9 = Perfil.objects.get_or_create(user=user9, defaults={'rol': Rol.objects.get(nombre='jefe_departamento')})
print(f"  Perfil jefededepartamento01 -> rol 'jefe_departamento' -> {'ASIGNADO' if cp9 else 'ya existia'}")
print()

# Diego Herrera (jefe_preceptores)
user10, created10 = User.objects.get_or_create(
    username='jefedepreceptores01',
    defaults={'first_name': 'Diego', 'last_name': 'Herrera'}
)
if created10:
    user10.set_password('jefedepreceptores01')
    user10.save()
    print("  Usuario 'jefedepreceptores01' (Diego Herrera) -> CREADO")
else:
    print("  Usuario 'jefedepreceptores01' (Diego Herrera) -> ya existia")
perfil10, cp10 = Perfil.objects.get_or_create(user=user10, defaults={'rol': Rol.objects.get(nombre='jefe_preceptores')})
print(f"  Perfil jefedepreceptores01 -> rol 'jefe_preceptores' -> {'ASIGNADO' if cp10 else 'ya existia'}")
print()

# Natalia Romero (ematp)
user11, created11 = User.objects.get_or_create(
    username='ematp01',
    defaults={'first_name': 'Natalia', 'last_name': 'Romero'}
)
if created11:
    user11.set_password('ematp01')
    user11.save()
    print("  Usuario 'ematp01' (Natalia Romero) -> CREADO")
else:
    print("  Usuario 'ematp01' (Natalia Romero) -> ya existia")
perfil11, cp11 = Perfil.objects.get_or_create(user=user11, defaults={'rol': Rol.objects.get(nombre='ematp')})
print(f"  Perfil ematp01 -> rol 'ematp' -> {'ASIGNADO' if cp11 else 'ya existia'}")
print()

# Gustavo Páez (EOE)
user12, created12 = User.objects.get_or_create(
    username='eoe01',
    defaults={'first_name': 'Gustavo', 'last_name': 'Páez'}
)
if created12:
    user12.set_password('eoe01')
    user12.save()
    print("  Usuario 'eoe01' (Gustavo Páez) -> CREADO")
else:
    print("  Usuario 'eoe01' (Gustavo Páez) -> ya existia")
perfil12, cp12 = Perfil.objects.get_or_create(user=user12, defaults={'rol': Rol.objects.get(nombre='EOE')})
print(f"  Perfil eoe01 -> rol 'EOE' -> {'ASIGNADO' if cp12 else 'ya existia'}")
print()

# Silvia Acosta (bibliotecario)
user13, created13 = User.objects.get_or_create(
    username='bibliotecario01',
    defaults={'first_name': 'Silvia', 'last_name': 'Acosta'}
)
if created13:
    user13.set_password('bibliotecario01')
    user13.save()
    print("  Usuario 'bibliotecario01' (Silvia Acosta) -> CREADO")
else:
    print("  Usuario 'bibliotecario01' (Silvia Acosta) -> ya existia")
perfil13, cp13 = Perfil.objects.get_or_create(user=user13, defaults={'rol': Rol.objects.get(nombre='bibliotecario')})
print(f"  Perfil bibliotecario01 -> rol 'bibliotecario' -> {'ASIGNADO' if cp13 else 'ya existia'}")
print()

# Facundo Quiroga (auxiliar)
user14, created14 = User.objects.get_or_create(
    username='auxiliar01',
    defaults={'first_name': 'Facundo', 'last_name': 'Quiroga'}
)
if created14:
    user14.set_password('auxiliar01')
    user14.save()
    print("  Usuario 'auxiliar01' (Facundo Quiroga) -> CREADO")
else:
    print("  Usuario 'auxiliar01' (Facundo Quiroga) -> ya existia")
perfil14, cp14 = Perfil.objects.get_or_create(user=user14, defaults={'rol': Rol.objects.get(nombre='auxiliar')})
print(f"  Perfil auxiliar01 -> rol 'auxiliar' -> {'ASIGNADO' if cp14 else 'ya existia'}")
print()

# --- Usuarios MULTIROL ---

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
print(f"  Perfil multirol10 -> roles 'familia, preceptor' -> {'ASIGNADO' if cp_m1 else 'actualizado'}")
print()

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
print(f"  Perfil multirol20 -> roles 'admin, jefe_area' -> {'ASIGNADO' if cp_m2 else 'actualizado'}")
print()

print("=== SEED COMPLETADO ===")
print()
print("USUARIOS DE PRUEBA:")
print("  estudiante        -> usuario: juan1234              | contraseña: juan1234")
print("  preceptor         -> usuario: blito4321             | contraseña: blito4321")
print("  admin             -> usuario: admin01               | contraseña: admin01")
print("  profesor          -> usuario: profe01               | contraseña: profe01")
print("  familia           -> usuario: familia01             | contraseña: familia01")
print("  director          -> usuario: director01            | contraseña: director01")
print("  secretario        -> usuario: secretario01          | contraseña: secretario01")
print("  jefe_area         -> usuario: jefedearea01          | contraseña: jefedearea01")
print("  jefe_departamento -> usuario: jefededepartamento01  | contraseña: jefededepartamento01")
print("  jefe_preceptores  -> usuario: jefedepreceptores01   | contraseña: jefedepreceptores01")
print("  ematp             -> usuario: ematp01               | contraseña: ematp01")
print("  EOE               -> usuario: eoe01                 | contraseña: eoe01")
print("  bibliotecario     -> usuario: bibliotecario01       | contraseña: bibliotecario01")
print("  auxiliar          -> usuario: auxiliar01            | contraseña: auxiliar01")
print()
print("USUARIOS MULTIROL:")
print("  familia+preceptor -> usuario: multirol10            | contraseña: multirol10")
print("  admin+jefe_area   -> usuario: multirol20            | contraseña: multirol20")
