"""
Script para insertar comunicados de prueba en la base de datos.
Ejecutar con: python manage.py shell < seed_comunicados.py
"""
import django
import os
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from usuarios.models import Comunicado

print("=== INSERTANDO COMUNICADOS DE PRUEBA ===")
print()

# Obtener usuarios de prueba
try:
    profesor = User.objects.get(username='profe01')
    preceptor = User.objects.get(username='blito4321')
    director = User.objects.get(username='director01')
    jefe_area = User.objects.get(username='jefedearea01')
    jefe_departamento = User.objects.get(username='jefededepartamento01')
    jefe_preceptores = User.objects.get(username='jefedepreceptores01')
    admin = User.objects.get(username='admin01')
except User.DoesNotExist as e:
    print(f"Error: Usuario no encontrado. Ejecuta primero seed.py")
    print(f"Usuario faltante: {e}")
    exit(1)

# --- Comunicado 1: Profesor a sus cursos ---
comunicado1, created1 = Comunicado.objects.get_or_create(
    titulo="Recordatorio de entrega de trabajos",
    defaults={
        "cuerpo": "Estimados estudiantes, recuerden que la entrega del trabajo práctico es el próximo viernes 15 de noviembre. Asegúrense de subirlo a la plataforma antes de las 23:59 hs.",
        "tipo_destinatario": "CursosEspecificos",
        "cursos_seleccionados": ["4° A", "4° B"],
        "creado_por": profesor,
        "fecha_publicacion": timezone.now().date()
    }
)
print(f"  Comunicado Profesor -> {'CREADO' if created1 else 'ya existía'}")

# --- Comunicado 2: Preceptor a su sección ---
comunicado2, created2 = Comunicado.objects.get_or_create(
    titulo="Reunión de padres 3° A",
    defaults={
        "cuerpo": "Se convoca a los padres/tutores de los estudiantes de 3° A a una reunión el día jueves 14 de noviembre a las 18:00 hs en el salón de usos múltiples. Se tratarán temas de convivencia y rendimiento académico.",
        "tipo_destinatario": "Familias",
        "cursos_seleccionados": ["3° A"],
        "creado_por": preceptor,
        "fecha_publicacion": timezone.now().date()
    }
)
print(f"  Comunicado Preceptor -> {'CREADO' if created2 else 'ya existía'}")

# --- Comunicado 3: Director a toda la comunidad ---
comunicado3, created3 = Comunicado.objects.get_or_create(
    titulo="Jornada institucional - No habrá clases",
    defaults={
        "cuerpo": "Se comunica a toda la comunidad educativa que el día viernes 22 de noviembre se realizará una jornada institucional para docentes y personal. Por lo tanto, NO HABRÁ CLASES para los estudiantes ese día.",
        "tipo_destinatario": "Todos",
        "cursos_seleccionados": [],
        "creado_por": director,
        "fecha_publicacion": timezone.now().date()
    }
)
print(f"  Comunicado Director -> {'CREADO' if created3 else 'ya existía'}")

# --- Comunicado 4: Jefe de Área a docentes ---
comunicado4, created4 = Comunicado.objects.get_or_create(
    titulo="Reunión de área de Matemáticas",
    defaults={
        "cuerpo": "Se convoca a todos los docentes de Matemáticas a una reunión el día miércoles 13 de noviembre a las 16:30 hs en la oficina de Jefatura de Área. Se discutirá la planificación del trimestre.",
        "tipo_destinatario": "Docentes",
        "cursos_seleccionados": [],
        "creado_por": jefe_area,
        "fecha_publicacion": timezone.now().date()
    }
)
print(f"  Comunicado Jefe Área -> {'CREADO' if created4 else 'ya existía'}")

# --- Comunicado 5: Jefe de Departamento ---
comunicado5, created5 = Comunicado.objects.get_or_create(
    titulo="Actualización de materiales de laboratorio",
    defaults={
        "cuerpo": "Se informa a los docentes del departamento de Ciencias Naturales que se ha completado la reposición de materiales de laboratorio. Pueden retirar los insumos necesarios en la oficina de departamento.",
        "tipo_destinatario": "Docentes",
        "cursos_seleccionados": [],
        "creado_por": jefe_departamento,
        "fecha_publicacion": timezone.now().date()
    }
)
print(f"  Comunicado Jefe Departamento -> {'CREADO' if created5 else 'ya existía'}")

# --- Comunicado 6: Jefe de Preceptores ---
comunicado6, created6 = Comunicado.objects.get_or_create(
    titulo="Capacitación para preceptores",
    defaults={
        "cuerpo": "Se convoca a todos los preceptores a una capacitación sobre manejo de conflictos el día sábado 16 de noviembre de 9:00 a 12:00 hs en el salón de profesores.",
        "tipo_destinatario": "Preceptores",
        "cursos_seleccionados": [],
        "creado_por": jefe_preceptores,
        "fecha_publicacion": timezone.now().date()
    }
)
print(f"  Comunicado Jefe Preceptores -> {'CREADO' if created6 else 'ya existía'}")

# --- Comunicado 7: Admin ---
comunicado7, created7 = Comunicado.objects.get_or_create(
    titulo="Mantenimiento del sistema - 20/11",
    defaults={
        "cuerpo": "Se comunica que el día miércoles 20 de noviembre de 18:00 a 20:00 hs se realizará mantenimiento del sistema de gestión escolar. Durante ese período, la plataforma estará temporalmente fuera de servicio.",
        "tipo_destinatario": "Todos",
        "cursos_seleccionados": [],
        "creado_por": admin,
        "fecha_publicacion": timezone.now().date()
    }
)
print(f"  Comunicado Admin -> {'CREADO' if created7 else 'ya existía'}")

print()
print("=== SEED DE COMUNICADOS COMPLETADO ===")
print()
print("COMUNICADOS CREADOS:")
print("  1. Profesor -> Cursos 4° A y 4° B (Recordatorio entrega)")
print("  2. Preceptor -> Familias de 3° A (Reunión padres)")
print("  3. Director -> Toda la comunidad (Jornada institucional)")
print("  4. Jefe Área -> Docentes (Reunión Matemáticas)")
print("  5. Jefe Departamento -> Docentes (Materiales laboratorio)")
print("  6. Jefe Preceptores -> Preceptores (Capacitación)")
print("  7. Admin -> Toda la comunidad (Mantenimiento sistema)")
