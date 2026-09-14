"""Explicit, idempotent synthetic fixtures for local functional validation."""
import os
from collections import Counter
from datetime import timedelta
from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from usuarios.models import (Rol, Perfil, Alumno, Docente, Preceptor, Familia,
    PersonalStaff, Curso, Materia, Horario, Nota, Asistencia, AsistenciaDiaria,
    Comunicado, Evento, Libro, Prestamo, Notificacion, GrupoChat, Mensaje)

PASSWORD = 'Synthetic!Password-4921'  # DEVELOPMENT ONLY, public synthetic accounts.
ROLES = ['admin','director','vicedirector','secretario','preceptor','profesor',
         'familia','estudiante','bibliotecario','eoe','ematp','auxiliar',
         'jefe_area','jefe_departamento','jefe_preceptores']


class Command(BaseCommand):
    help = 'Create fictional local test data. Never runs in staging or production.'

    @transaction.atomic
    def handle(self, *args, **options):
        module = os.environ.get('DJANGO_SETTINGS_MODULE', '')
        environment = os.environ.get('DJANGO_ENV', 'development')
        db_name = str(settings.DATABASES['default']['NAME'])
        isolated_test = module == 'backend.settings_test'
        if environment != 'development' or (not isolated_test and (not settings.DEBUG or not db_name.endswith('_local'))):
            raise CommandError('seed_test_data is restricted to development and a database ending in _local.')
        counts = {'created': Counter(), 'existing': Counter()}

        def ensure(model, defaults=None, **lookup):
            obj, created = model.objects.get_or_create(defaults=defaults or {}, **lookup)
            counts['created' if created else 'existing'][model.__name__] += 1
            return obj

        users = {}
        accounts = [(role, role) for role in ROLES] + [('profesor2','profesor')] + [(f'estudiante{i}','estudiante') for i in range(2,5)]
        for name, role in accounts:
            username = 'test_' + name
            email = username + '@eestn1.example.invalid'
            existing = User.objects.filter(username=username).first()
            if existing and existing.email != email:
                raise CommandError(f'{username} already exists outside the synthetic namespace; nothing changed.')
            user = ensure(User, username=username, defaults={'email':email,'first_name':'Ficticio','last_name':name})
            if not existing:
                user.set_password(os.environ.get('TEST_DATA_PASSWORD', PASSWORD))
                user.save(update_fields=['password'])
            ensure(Perfil, user=user, defaults={'rol':ensure(Rol, nombre=role)})
            users[name] = user

        courses = [ensure(Curso, año=year, division=division, defaults={'carrera':'Testing ficticio'}) for year,division in [(1,'A'),(2,'B'),(7,'A')]]
        subjects = [ensure(Materia, nombre='Materia ficticia '+str(i+1), curso=course, defaults={'horas':2}) for i,course in enumerate(courses)]
        for i,name in enumerate(['profesor','profesor2','jefe_area','jefe_departamento']):
            teacher=ensure(Docente,user=users[name],defaults={'nombre':'Docente ficticio','apellido':str(i+1),'dni':str(98000100+i),'fecha_nacimiento':'1990-01-01','telefono':'  +54 11 0000 0000  ','cargo':'Profesor'})
            teacher.cursos_asignados.add(courses[i % 3])
            teacher.materias.add(subjects[i % 3])
        for i,name in enumerate(['preceptor','jefe_preceptores']):
            ensure(Preceptor,user=users[name],defaults={'nombre':'Preceptor ficticio','apellido':str(i+1),'dni':str(98000200+i),'fecha_nacimiento':'1990-01-01','turno':'Mañana','cursos_asignados':','.join(str(c.pk) for c in courses[:2])})
        students=[]
        for i,name in enumerate(['estudiante','estudiante2','estudiante3','estudiante4']):
            course=courses[0 if i < 2 else i-1]
            students.append(ensure(Alumno,user=users[name],defaults={'nombre':'Estudiante ficticio','apellido':str(i+1),'dni':str(98000300+i),'fecha_nacimiento':'2010-01-01','año':course.año,'division':course.division,'grupo':'A' if i%2==0 else 'B','identidad_genero':'Ficticia','calle':'Calle de prueba','telefonos_tutores':[{'titulo':'Tutor ficticio','numero':'  +54 11 1111 1111  '}]}))
        family=ensure(Familia,user=users['familia'],defaults={'nombre':'Familia ficticia','apellido':'Testing','dni':'98000400','ocupacion':'Ocupación de prueba'})
        family.alumnos.add(*students[:2])
        for i,name in enumerate(['director','vicedirector','secretario','bibliotecario','eoe','ematp','auxiliar']):
            ensure(PersonalStaff,user=users[name],defaults={'nombre':'Personal ficticio','apellido':name,'dni':str(98000500+i),'cargo':name,'identidad_genero':'Ficticia','calle':'Calle de prueba'})
        today=timezone.localdate()
        for i,course in enumerate(courses):
            ensure(Horario,curso=course,materia=subjects[i],dia=0,franja=0,defaults={'aula':'Prueba'})
        for i,student in enumerate(students):
            subject=subjects[0 if i<2 else i-1]
            ensure(Nota,estudiante=student,materia=subject,defaults={'n1':7})
            ensure(Asistencia,estudiante=student,materia=subject,defaults={'presentes':10,'ausentes':1,'total':11})
            ensure(AsistenciaDiaria,estudiante=student,fecha=today,defaults={'estado':['Presente','Ausente','Media Falta','Presente'][i]})
        ensure(Comunicado,titulo='[TEST] Comunicado general',creado_por=users['admin'],defaults={'cuerpo':'Información totalmente ficticia.','tipo_destinatario':'Todos'})
        ensure(Evento,titulo='[TEST] Evento general',creado_por=users['preceptor'],defaults={'fecha':today+timedelta(days=1),'hora_inicio':'10:00','hora_fin':'11:00','ciclo':'todos','lugar':'Biblioteca','descripcion':'Evento ficticio para editar.'})
        book=ensure(Libro,titulo='[TEST] Libro ficticio',autor='Autor ficticio',defaults={'copias':3,'disponibles':3,'editorial':'Prueba','anio':2026,'ubicacion':'A1'})
        ensure(Prestamo,libro=book,usuario=users['estudiante'],defaults={'fecha_prestamo':today,'fecha_entrega':today+timedelta(days=7),'estado':'Pendiente'})
        group=ensure(GrupoChat,nombre='[TEST] Grupo de cuatro',creador=users['admin'])
        group.miembros.add(users['admin'],users['director'],users['secretario'],users['preceptor'])
        for i in range(205):
            ensure(Mensaje,grupo=group,remitente=users['director'],contenido=f'[TEST] Historial {i+1:03d}')
        ensure(Mensaje,remitente=users['preceptor'],destinatario=users['estudiante'],contenido='[TEST] Mensaje individual ficticio')
        for user in users.values():
            ensure(Notificacion,usuario=user,titulo='[TEST] Bienvenida ficticia',defaults={'tipo':'sistema','cuerpo':'Notificación de prueba de persistencia.'})
        for category, counter in counts.items():
            self.stdout.write(category.upper()+': '+', '.join(f'{model}={number}' for model,number in sorted(counter.items())))
        self.stdout.write('DEVELOPMENT ONLY. Accounts: '+', '.join(u.username for u in users.values()))
