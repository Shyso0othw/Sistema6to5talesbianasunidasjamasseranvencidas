"""
Seed completo para pruebas del sistema EEST N°1.
Puebla toda la base de datos con datos de prueba.
Ejecutar: python seed_completo.py
"""
import os
import sys
import random
from datetime import date, time
from collections import defaultdict

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.contrib.auth.models import User
from django.db import IntegrityError
from usuarios.models import (
    Rol, Perfil, Curso, Materia, Alumno, Docente, Preceptor,
    Familia, PersonalStaff, Nota, Asistencia, Evento, Comunicado
)

print("=" * 60)
print("  SEED COMPLETO - Carga de datos de prueba")
print("=" * 60)

# ---------------------------------------------------------------
# 1. ROLES
# ---------------------------------------------------------------
print("\n[1/13] Creando Roles...")
roles_list = [
    'estudiante', 'preceptor', 'admin', 'profesor', 'familia',
    'director', 'secretario', 'jefe_area', 'jefe_departamento',
    'jefe_preceptores', 'ematp', 'EOE', 'bibliotecario', 'auxiliar'
]
roles_map = {}
for nombre in roles_list:
    try:
        rol, created = Rol.objects.get_or_create(nombre=nombre)
        roles_map[nombre] = rol
        print(f"   {nombre}: {'CREADO' if created else 'ya existe'}")
    except Exception as e:
        print(f"   ERROR: {e}")

# ---------------------------------------------------------------
# 2. ADMIN USERS
# ---------------------------------------------------------------
print("\n[2/13] Creando Usuarios Admin...")
admins = [
    ('admin01', 'Carlos', 'Ramirez'),
    ('admin02', 'Diana', 'Lopez'),
    ('admin03', 'Eduardo', 'Martinez'),
]
admin_users = []
for username, first_name, last_name in admins:
    try:
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            user.set_password(username)
            user.save()
        Perfil.objects.get_or_create(
            user=user,
            defaults={'rol': roles_map['admin']}
        )
        admin_users.append(user)
        print(f"   {username} ({first_name} {last_name}): {'CREADO' if created else 'ya existe'}")
    except Exception as e:
        print(f"   ERROR: {e}")

# ---------------------------------------------------------------
# 3. CURSOS
# ---------------------------------------------------------------
print("\n[3/13] Creando Cursos...")

cursos_def = []
for a in range(1, 4):
    for div in ['A', 'B', 'C', 'D', 'E']:
        cursos_def.append((a, div, ''))
for a in range(4, 8):
    cursos_def.append((a, '1ra', 'MMO'))
    cursos_def.append((a, '2da', 'Informatica'))
    cursos_def.append((a, '3ra', 'Programacion'))

curso_map = {}
for a, d, carrera in cursos_def:
    try:
        curso, created = Curso.objects.get_or_create(
            año=a, division=d,
            defaults={'carrera': carrera, 'activo': True}
        )
        key = f"{a}\u00b0{d}"
        curso_map[key] = curso
        print(f"   {key}: {'CREADO' if created else 'ya existe'}")
    except Exception as e:
        print(f"   ERROR {a}\u00b0{d}: {e}")

# ---------------------------------------------------------------
# 4. MATERIAS
# ---------------------------------------------------------------
print("\n[4/13] Creando Materias...")

basica_mat = ['Matematica', 'Lengua', 'Ingles', 'Ciencias Naturales',
              'Ciencias Sociales', 'Educacion Fisica', 'Arte', 'Tecnologia']
superior_comun = ['Matematica', 'Lengua', 'Ingles', 'Educacion Fisica']
mmo_mat = ['Dibujo Tecnico', 'Materiales', 'Estructuras', 'Instalaciones',
           'Proyecto', 'Topografia', 'Seguridad']
info_mat = ['Programacion I', 'Programacion II', 'Programacion III',
            'Base de Datos', 'Redes', 'Sistemas Operativos', 'Laboratorio']
prog_mat = ['Algoritmos', 'POO', 'Base de Datos', 'Web I', 'Web II',
            'Testing', 'DevOps']

for key, curso in sorted(curso_map.items(), key=lambda x: x[0]):
    try:
        if curso.año <= 3:
            materias_nombres = basica_mat
        elif '1ra' in curso.division:
            materias_nombres = superior_comun + mmo_mat
        elif '2da' in curso.division:
            materias_nombres = superior_comun + info_mat
        else:
            materias_nombres = superior_comun + prog_mat

        for nom in materias_nombres:
            Materia.objects.get_or_create(
                nombre=nom, curso=curso,
                defaults={'horas': random.choice([2, 3, 4])}
            )
        total = Materia.objects.filter(curso=curso).count()
        print(f"   {key}: {total} materias")
    except Exception as e:
        print(f"   ERROR {key}: {e}")

# ---------------------------------------------------------------
# 5. ALUMNOS
# ---------------------------------------------------------------
print("\n[5/13] Creando Alumnos...")

nombres_alumnos = [
    'Santiago', 'Mateo', 'Benjamin', 'Lucas', 'Thiago', 'Joaquin', 'Facundo',
    'Agustin', 'Ignacio', 'Franco', 'Lautaro', 'Bautista', 'Tomas', 'Bruno',
    'Valentino', 'Luciano', 'Santino', 'Julian', 'Pedro', 'Manuel',
    'Valentina', 'Sofia', 'Martina', 'Camila', 'Isabella', 'Lucia',
    'Emma', 'Catalina', 'Julieta', 'Mia', 'Renata', 'Emilia', 'Lara',
    'Morena', 'Delfina', 'Victoria', 'Antonella', 'Lourdes', 'Florencia', 'Candela'
]
apellidos_alumnos = [
    'Gonzalez', 'Rodriguez', 'Lopez', 'Fernandez', 'Martinez', 'Perez',
    'Garcia', 'Romero', 'Diaz', 'Torres', 'Alvarez', 'Ruiz', 'Sanchez',
    'Ramirez', 'Medina', 'Moreno', 'Ortiz', 'Castillo', 'Flores', 'Acosta',
    'Gimenez', 'Herrera', 'Pereyra', 'Rojas', 'Sosa', 'Molina', 'Juarez',
    'Coronel', 'Morales', 'Godoy'
]

dni_counter = [40000000]
alumnos_por_curso = {}

for key, curso in sorted(curso_map.items(), key=lambda x: x[0]):
    cantidad = random.randint(5, 8)
    alumnos_por_curso[key] = []
    for _ in range(cantidad):
        dni_counter[0] += 1
        dni = str(dni_counter[0])
        nombre = random.choice(nombres_alumnos)
        apellido = random.choice(apellidos_alumnos)
        try:
            user, u_created = User.objects.get_or_create(
                username=dni,
                defaults={'first_name': nombre, 'last_name': apellido}
            )
            if u_created:
                user.set_password(dni)
                user.save()

            alumno, a_created = Alumno.objects.get_or_create(
                dni=dni,
                defaults={
                    'user': user,
                    'nombre': nombre,
                    'apellido': apellido,
                    'cuil': f"20-{dni}-1",
                    'fecha_nacimiento': date(
                        random.randint(2006, 2013),
                        random.randint(1, 12),
                        random.randint(1, 28)
                    ),
                    'año': curso.año,
                    'division': curso.division,
                    'direccion': f"Av. Siempre Viva {random.randint(100, 9999)}",
                    'lugar_nacimiento': 'Local',
                    'nacionalidad': 'Argentina',
                    'localidad': 'Ciudad',
                    'partido': 'Capital',
                    'sexo': random.choice(['Masculino', 'Femenino']),
                    'telefono_padre': f"11{random.randint(10000000, 99999999)}",
                    'telefono_madre': f"11{random.randint(10000000, 99999999)}",
                }
            )
            if a_created:
                Perfil.objects.get_or_create(
                    user=user,
                    defaults={'rol': roles_map['estudiante']}
                )
            alumnos_por_curso[key].append(alumno)
        except Exception as e:
            print(f"   ERROR alumno DNI {dni}: {e}")

    total = len(alumnos_por_curso[key])
    print(f"   {key}: {total} alumnos")

# ---------------------------------------------------------------
# 6. DOCENTES
# ---------------------------------------------------------------
print("\n[6/13] Creando Docentes...")

docentes_data = [
    ('Laura', 'Garcia', 'Matematica'),
    ('Carlos', 'Martinez', 'Lengua'),
    ('Ana', 'Lopez', 'Ingles'),
    ('Pedro', 'Gomez', 'Ciencias Naturales'),
    ('Maria', 'Rodriguez', 'Ciencias Sociales'),
    ('Jose', 'Fernandez', 'Educacion Fisica'),
    ('Silvia', 'Pereyra', 'Arte'),
    ('Roberto', 'Sosa', 'Tecnologia'),
    ('Marcela', 'Diaz', 'Programacion'),
    ('Fernando', 'Morales', 'Base de Datos'),
]

docentes_creados = []
for i, (nom, ape, materia) in enumerate(docentes_data):
    dni_counter[0] += 1
    dni = str(dni_counter[0])
    try:
        username = f"profe{i+1:02d}"
        user, u_created = User.objects.get_or_create(
            username=username,
            defaults={'first_name': nom, 'last_name': ape}
        )
        if u_created:
            user.set_password(username)
            user.save()

        docente, d_created = Docente.objects.get_or_create(
            dni=dni,
            defaults={
                'user': user,
                'nombre': nom,
                'apellido': ape,
                'cuil': f"20-{dni}-1",
                'fecha_nacimiento': date(
                    random.randint(1970, 1990),
                    random.randint(1, 12),
                    random.randint(1, 28)
                ),
                'direccion': f"Docente St. {random.randint(100, 9999)}",
                'telefono': f"11{random.randint(40000000, 99999999)}",
                'email': f"{nom.lower()}.{ape.lower()}@eestn1.edu.ar",
                'materia': materia,
                'cargo': 'Profesor',
            }
        )
        if d_created:
            Perfil.objects.get_or_create(
                user=user,
                defaults={'rol': roles_map['profesor']}
            )
        docentes_creados.append(docente)
        print(f"   {nom} {ape} (DNI {dni}): {'CREADO' if d_created else 'ya existe'}")
    except Exception as e:
        print(f"   ERROR {nom} {ape}: {e}")

print("   Asignando materias a docentes...")
for docente in docentes_creados:
    try:
        todas = Materia.objects.filter(curso__activo=True)
        seleccionadas = random.sample(list(todas), min(3, todas.count()))
        docente.materias.set(seleccionadas)
        mats = ', '.join([m.nombre[:15] for m in seleccionadas])
        print(f"      {docente.nombre} {docente.apellido}: {mats}")
    except Exception as e:
        print(f"      ERROR: {e}")

# ---------------------------------------------------------------
# 7. PRECEPTORES
# ---------------------------------------------------------------
print("\n[7/13] Creando Preceptores...")

preceptores_data = [
    ('Pablo', 'Perez', 'Manana', '1A,1B,1C,2A,2B,3A'),
    ('Lucia', 'Ramirez', 'Tarde', '3B,3C,4\u00b01ra,4\u00b02da,5\u00b01ra,5\u00b02da'),
    ('Martin', 'Alvarez', 'Manana', '6\u00b01ra,6\u00b02da,6\u00b03ra,7\u00b01ra,7\u00b02da,7\u00b03ra'),
]

for i, (nom, ape, turno, cursos) in enumerate(preceptores_data):
    dni_counter[0] += 1
    dni = str(dni_counter[0])
    try:
        username = f"preceptor{i+1:02d}"
        user, u_created = User.objects.get_or_create(
            username=username,
            defaults={'first_name': nom, 'last_name': ape}
        )
        if u_created:
            user.set_password(username)
            user.save()

        preceptor, p_created = Preceptor.objects.get_or_create(
            dni=dni,
            defaults={
                'user': user,
                'nombre': nom,
                'apellido': ape,
                'cuil': f"20-{dni}-1",
                'fecha_nacimiento': date(
                    random.randint(1975, 1995),
                    random.randint(1, 12),
                    random.randint(1, 28)
                ),
                'direccion': f"Preceptor St. {random.randint(100, 9999)}",
                'telefono': f"11{random.randint(40000000, 99999999)}",
                'email': f"{nom.lower()}.{ape.lower()}@eestn1.edu.ar",
                'turno': turno,
                'cursos_asignados': cursos,
            }
        )
        if p_created:
            Perfil.objects.get_or_create(
                user=user,
                defaults={'rol': roles_map['preceptor']}
            )
        print(f"   {nom} {ape} (turno {turno}): {'CREADO' if p_created else 'ya existe'}")
    except Exception as e:
        print(f"   ERROR {nom} {ape}: {e}")

# ---------------------------------------------------------------
# 8. FAMILIAS
# ---------------------------------------------------------------
print("\n[8/13] Creando Familias...")

familias_data = [
    ('Maria', 'Gonzalez', 'Madre'),
    ('Ricardo', 'Lopez', 'Padre'),
    ('Gabriela', 'Martinez', 'Madre'),
    ('Hector', 'Fernandez', 'Padre'),
    ('Veronica', 'Torres', 'Madre'),
]

all_alumnos = list(Alumno.objects.all())
for i, (nom, ape, relacion) in enumerate(familias_data):
    dni_counter[0] += 1
    dni = str(dni_counter[0])
    try:
        username = f"familia{i+1:02d}"
        user, u_created = User.objects.get_or_create(
            username=username,
            defaults={'first_name': nom, 'last_name': ape}
        )
        if u_created:
            user.set_password(username)
            user.save()

        familia, f_created = Familia.objects.get_or_create(
            dni=dni,
            defaults={
                'user': user,
                'nombre': nom,
                'apellido': ape,
                'cuil': f"27-{dni}-1",
                'fecha_nacimiento': date(
                    random.randint(1970, 1990),
                    random.randint(1, 12),
                    random.randint(1, 28)
                ),
                'direccion': f"Familia St. {random.randint(100, 9999)}",
                'telefono': f"11{random.randint(40000000, 99999999)}",
                'email': f"{nom.lower()}.{ape.lower()}@email.com",
                'relacion': relacion,
                'estado_civil': random.choice(['Casado/a', 'Soltero/a', 'Divorciado/a']),
                'ocupacion': random.choice(['Empleado/a', 'Docente', 'Comerciante', 'Profesional']),
            }
        )
        if f_created:
            Perfil.objects.get_or_create(
                user=user,
                defaults={'rol': roles_map['familia']}
            )
            hijos = random.sample(all_alumnos, min(2, len(all_alumnos)))
            familia.alumnos.set(hijos)
        print(f"   {nom} {ape} ({relacion}): {'CREADA' if f_created else 'ya existe'}")
    except Exception as e:
        print(f"   ERROR {nom} {ape}: {e}")

# ---------------------------------------------------------------
# 9. PERSONAL STAFF
# ---------------------------------------------------------------
print("\n[9/13] Creando Personal Staff...")

staff_def = [
    ('Marcelo', 'Fernandez', 'director', 'Director'),
    ('Valeria', 'Sosa', 'secretario', 'Secretaria'),
    ('Facundo', 'Quiroga', 'auxiliar', 'Auxiliar'),
    ('Silvia', 'Acosta', 'bibliotecario', 'Bibliotecario'),
    ('Gustavo', 'Paez', 'EOE', 'EOE'),
    ('Natalia', 'Romero', 'ematp', 'EMATP'),
]

for nom, ape, rol_nombre, cargo in staff_def:
    dni_counter[0] += 1
    dni = str(dni_counter[0])
    try:
        username = f"{rol_nombre}01"
        user, u_created = User.objects.get_or_create(
            username=username,
            defaults={'first_name': nom, 'last_name': ape}
        )
        if u_created:
            user.set_password(username)
            user.save()

        staff, s_created = PersonalStaff.objects.get_or_create(
            dni=dni,
            defaults={
                'user': user,
                'nombre': nom,
                'apellido': ape,
                'cuil': f"20-{dni}-1",
                'telefono': f"11{random.randint(40000000, 99999999)}",
                'email': f"{nom.lower()}.{ape.lower()}@eestn1.edu.ar",
                'fecha_nacimiento': date(
                    random.randint(1970, 1990),
                    random.randint(1, 12),
                    random.randint(1, 28)
                ),
                'direccion': f"Staff St. {random.randint(100, 9999)}",
                'cargo': cargo,
                'estado_civil': random.choice(['Casado/a', 'Soltero/a']),
                'lugar_nacimiento': 'Local',
                'nacionalidad': 'Argentina',
                'sexo': random.choice(['Masculino', 'Femenino']),
            }
        )
        if s_created:
            Perfil.objects.get_or_create(
                user=user,
                defaults={'rol': roles_map[rol_nombre]}
            )
        print(f"   {nom} {ape} ({cargo}): {'CREADO' if s_created else 'ya existe'}")
    except Exception as e:
        print(f"   ERROR {nom} {ape}: {e}")

# ---------------------------------------------------------------
# 10. NOTAS (bulk_create for speed)
# ---------------------------------------------------------------
print("\n[10/13] Creando Notas...")

notas_new_count = 0
for key, alumnos in alumnos_por_curso.items():
    curso = curso_map[key]
    materias = list(Materia.objects.filter(curso=curso))
    if not materias:
        continue

    existing = set(
        Nota.objects.filter(
            estudiante__in=alumnos, materia__in=materias
        ).values_list('estudiante_id', 'materia_id')
    )

    new_notas = []
    for alumno in alumnos:
        for materia in materias:
            if (alumno.id, materia.id) not in existing:
                new_notas.append(Nota(
                    estudiante=alumno,
                    materia=materia,
                    v1=random.choice([6, 7, 8, 9, 10]),
                    n1=random.choice([6, 7, 8, 9, 10]),
                    vi1=random.choice([6, 7, 8, 9, 10]),
                    i1=random.choice([6, 7, 8, 9, 10]),
                    v2=random.choice([6, 7, 8, 9, 10]),
                    n2=random.choice([6, 7, 8, 9, 10]),
                    dic=random.choice([6, 7, 8, 9, 10]),
                    mar=random.choice([6, 7, 8, 9, 10]),
                    inasistencias=random.randint(0, 15),
                ))

    if new_notas:
        Nota.objects.bulk_create(new_notas, ignore_conflicts=True)
        notas_new_count += len(new_notas)

    print(f"   {key}: {len(new_notas)} nuevas")

print(f"   Total nuevas notas: {notas_new_count}")

# ---------------------------------------------------------------
# 11. ASISTENCIAS (bulk_create for speed)
# ---------------------------------------------------------------
print("\n[11/13] Creando Asistencias...")

asist_new_count = 0
for key, alumnos in alumnos_por_curso.items():
    curso = curso_map[key]
    materias = list(Materia.objects.filter(curso=curso))
    if not materias:
        continue

    existing = set(
        Asistencia.objects.filter(
            estudiante__in=alumnos, materia__in=materias
        ).values_list('estudiante_id', 'materia_id')
    )

    new_asistencias = []
    for alumno in alumnos:
        for materia in materias:
            if (alumno.id, materia.id) not in existing:
                presentes = random.randint(20, 35)
                ausentes = random.randint(0, 5)
                justificadas = random.randint(0, min(3, ausentes))
                total = presentes + ausentes
                new_asistencias.append(Asistencia(
                    estudiante=alumno,
                    materia=materia,
                    presentes=presentes,
                    ausentes=ausentes,
                    justificadas=justificadas,
                    injustificadas=ausentes - justificadas,
                    tardes=random.randint(0, 8),
                    total=total,
                ))

    if new_asistencias:
        Asistencia.objects.bulk_create(new_asistencias, ignore_conflicts=True)
        asist_new_count += len(new_asistencias)

    print(f"   {key}: {len(new_asistencias)} nuevas")

print(f"   Total nuevas asistencias: {asist_new_count}")

# ---------------------------------------------------------------
# 12. EVENTOS
# ---------------------------------------------------------------
print("\n[12/13] Creando Eventos...")

referencia_user = admin_users[0] if admin_users else None

eventos_data = [
    {
        'titulo': 'Acto de Inicio de Clases',
        'descripcion': 'Acto formal de inicio del ciclo lectivo 2026.',
        'fecha': date(2026, 3, 2),
        'hora_inicio': time(8, 0),
        'hora_fin': time(10, 0),
        'lugar': 'Salon de Usos Multiples',
        'tipo': 'Acto',
        'ciclo': 'Todos',
    },
    {
        'titulo': 'Feria de Ciencias',
        'descripcion': 'Exposicion de proyectos cientificos de los alumnos.',
        'fecha': date(2026, 6, 15),
        'hora_inicio': time(9, 0),
        'hora_fin': time(16, 0),
        'lugar': 'Patio Central',
        'tipo': 'Academico',
        'ciclo': 'Todos',
    },
    {
        'titulo': 'Jornada de Integracion',
        'descripcion': 'Actividades recreativas y deportivas para todos los cursos.',
        'fecha': date(2026, 9, 10),
        'hora_inicio': time(8, 30),
        'hora_fin': time(15, 30),
        'lugar': 'Campo de Deportes',
        'tipo': 'Recreativo',
        'ciclo': 'Ciclo Basico',
    },
    {
        'titulo': 'Reunion de Padres 1° Año',
        'descripcion': 'Reunion informativa para familias del ciclo basico.',
        'fecha': date(2026, 4, 5),
        'hora_inicio': time(18, 0),
        'hora_fin': time(19, 30),
        'lugar': 'Aulas',
        'tipo': 'Reunion',
        'ciclo': 'Ciclo Basico',
        'curso': '1°',
    },
]

for ev in eventos_data:
    try:
        defaults = {k: v for k, v in ev.items() if k != 'titulo'}
        if referencia_user:
            defaults['creado_por'] = referencia_user
        _, created = Evento.objects.get_or_create(
            titulo=ev['titulo'],
            defaults=defaults
        )
        print(f"   {ev['titulo']}: {'CREADO' if created else 'ya existe'}")
    except Exception as e:
        print(f"   ERROR {ev['titulo']}: {e}")

# ---------------------------------------------------------------
# 13. COMUNICADOS
# ---------------------------------------------------------------
print("\n[13/13] Creando Comunicados...")

comunicados_data = [
    {
        'titulo': 'Inicio de Clases 2026',
        'cuerpo': ('Se informa que las clases comenzaran el 2 de marzo de 2026. '
                   'Los alumnos deben presentarse con el uniforme completo.'),
        'tipo_destinatario': 'Todos',
    },
    {
        'titulo': 'Normas de Convivencia',
        'cuerpo': ('Se recuerda que esta prohibido el uso del celular en horario '
                   'de clases. Mantener el orden y la limpieza en las instalaciones.'),
        'tipo_destinatario': 'Estudiantes',
    },
    {
        'titulo': 'Feriado Nacional 25 de Mayo',
        'cuerpo': ('Se suspenden las actividades el 25 de mayo. Las clases '
                   'se retomaran con normalidad el dia siguiente.'),
        'tipo_destinatario': 'Todos',
    },
]

if not referencia_user:
    print("   ADVERTENCIA: No hay usuario admin, se usara un User temporal")
    referencia_user, _ = User.objects.get_or_create(
        username='admin01',
        defaults={'first_name': 'Carlos', 'last_name': 'Ramirez'}
    )

for com in comunicados_data:
    try:
        _, created = Comunicado.objects.get_or_create(
            titulo=com['titulo'],
            defaults={
                'cuerpo': com['cuerpo'],
                'tipo_destinatario': com['tipo_destinatario'],
                'creado_por': referencia_user,
            }
        )
        print(f"   {com['titulo']}: {'CREADO' if created else 'ya existe'}")
    except Exception as e:
        print(f"   ERROR {com['titulo']}: {e}")

# ---------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------
print("\n" + "=" * 60)
print("  SEED COMPLETADO - Resumen")
print("=" * 60)
print(f"  Roles:            {Rol.objects.count()}")
print(f"  Cursos:           {Curso.objects.count()}")
print(f"  Materias:         {Materia.objects.count()}")
print(f"  Alumnos:          {Alumno.objects.count()}")
print(f"  Docentes:         {Docente.objects.count()}")
print(f"  Preceptores:      {Preceptor.objects.count()}")
print(f"  Familias:         {Familia.objects.count()}")
print(f"  PersonalStaff:    {PersonalStaff.objects.count()}")
print(f"  Notas:            {Nota.objects.count()}")
print(f"  Asistencias:      {Asistencia.objects.count()}")
print(f"  Eventos:          {Evento.objects.count()}")
print(f"  Comunicados:      {Comunicado.objects.count()}")
print(f"  Users (total):    {User.objects.count()}")
print()
print("  Users de prueba:")
print("  - Alumno:         username = DNI, password = DNI")
print("  - Admin:          admin01..03 / admin01..03")
print("  - Docentes:       profe01..10 / profe01..10")
print("  - Preceptores:    preceptor01..03 / preceptor01..03")
print("  - Familias:       familia01..05 / familia01..05")
print("  - Staff:          director01, secretario01, auxiliar01, bibliotecario01, eoe01, ematp01")
print()
print("  Seed completado exitosamente!")
