"""Regression tests use synthetic school records and an isolated test database."""
from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import resolve
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from usuarios.models import (Rol, Perfil, Alumno, Docente, Preceptor, Familia, PersonalStaff,
                             Curso, Materia, Nota, AsistenciaDiaria, Evento, Comunicado,
                             Libro, Prestamo, GrupoChat, Mensaje, Notificacion)
from usuarios.serializers import NotaSerializer


class HardeningTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.users = {}
        for role in ('admin','secretario','director','jefe_area','profesor','preceptor','estudiante','familia','bibliotecario','eoe','ematp'):
            u = User.objects.create_user('test_'+role, password='Synthetic!Password-4921')
            Perfil.objects.create(user=u, rol=Rol.objects.get_or_create(nombre=role)[0])
            cls.users[role] = u
        cls.course = Curso.objects.create(año=1, division='A')
        cls.other_course = Curso.objects.create(año=2, division='B')
        cls.subject = Materia.objects.create(nombre='Materia sintética', curso=cls.course)
        cls.other_subject = Materia.objects.create(nombre='Otra sintética', curso=cls.other_course)
        cls.student = Alumno.objects.create(user=cls.users['estudiante'], nombre='Alumno', apellido='Prueba', dni='99000001', fecha_nacimiento='2010-01-01', año=1, division='A')
        cls.other = Alumno.objects.create(nombre='Otro', apellido='Prueba', dni='99000002', fecha_nacimiento='2010-01-01', año=2, division='B', alergias='MARCADOR_SINTETICO_PRIVADO')
        cls.family = Familia.objects.create(user=cls.users['familia'],nombre='Familia',apellido='Prueba',dni='99000003')
        cls.family.alumnos.add(cls.student)
        cls.teacher = Docente.objects.create(user=cls.users['profesor'],nombre='Docente',apellido='Prueba',dni='99000004',fecha_nacimiento='1990-01-01')
        cls.teacher.cursos_asignados.add(cls.course)
        cls.teacher.materias.add(cls.subject)
        cls.prefect = Preceptor.objects.create(user=cls.users['preceptor'],nombre='Preceptor',apellido='Prueba',dni='99000005',fecha_nacimiento='1990-01-01',cursos_asignados='1° A')
        cls.note = Nota.objects.create(estudiante=cls.other,materia=cls.other_subject,n1=8)
        cls.event = Evento.objects.create(titulo='Evento sintético',fecha='2026-10-01',ciclo='todos',creado_por=cls.users['admin'])

    def setUp(self):
        self.client = APIClient()

    def test_event_empty_description_and_duplicate(self):
        self.actor('admin')
        payload = {'titulo':'Evento único', 'fecha':'2026-10-02', 'ciclo':'todos', 'descripcion':''}
        self.assertEqual(self.client.post('/api/eventos/', payload, format='json').status_code, 201)
        self.assertEqual(self.client.post('/api/eventos/', payload, format='json').status_code, 400)
        self.assertEqual(Evento.objects.filter(titulo='Evento único').count(), 1)

    def test_event_partial_time_validation(self):
        self.event.hora_inicio = '10:00'
        self.event.hora_fin = '11:00'
        self.event.save()
        self.actor('admin')
        response = self.client.patch(f'/api/eventos/{self.event.pk}/', {'hora_fin':'09:00'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_prefect_edits_own_event(self):
        self.event.creado_por = self.users['preceptor']
        self.event.save()
        self.actor('preceptor')
        self.assertEqual(self.client.patch(f'/api/eventos/{self.event.pk}/', {'titulo':'Editado'}, format='json').status_code, 200)

    def test_notice_revokes_previous_recipient(self):
        from unittest.mock import patch
        notice = Comunicado.objects.create(titulo='Cambio', cuerpo='Anterior', creado_por=self.users['admin'], tipo_destinatario='Todos')
        Notificacion.objects.create(usuario=self.users['estudiante'], tipo='comunicado', titulo='Cambio', cuerpo='Anterior', metadata={'comunicado_id':notice.pk})
        self.actor('admin')
        with patch('usuarios.views.comms_views.notify_group') as notify, self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(f'/api/comunicados/{notice.pk}/', {'tipo_destinatario':'Docentes','cuerpo':'Solo docentes'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Notificacion.objects.filter(usuario=self.users['estudiante'], metadata__comunicado_id=notice.pk).exists())
        student_messages = [c.args[1] for c in notify.call_args_list if c.args[0] == f'user_{self.users["estudiante"].pk}']
        self.assertEqual(student_messages, [{'type':'comunicado','comunicado':{'id':notice.pk},'action':'deleted'}])

    def actor(self, role):
        self.client.force_authenticate(self.users[role])

    def test_public_login_valid(self):
        r=self.client.post('/api/login/',{'username':'test_estudiante','password':'Synthetic!Password-4921'})
        self.assertEqual(r.status_code,200)
        self.assertIn('token',r.data)

    def test_public_login_invalid(self):
        self.assertEqual(self.client.post('/api/login/',{'username':'test_estudiante','password':'wrong'}).status_code,401)

    def test_anonymous_users(self):
        self.assertEqual(self.client.post('/api/usuarios/crear/',{}).status_code,401)

    def test_anonymous_courses(self):
        self.assertEqual(self.client.post('/api/cursos/',{'año':7,'division':'A'}).status_code,401)

    def test_anonymous_attendance(self):
        self.assertEqual(self.client.post('/api/asistencias-diarias/',{}).status_code,401)

    def test_student_foreign_detail(self):
        self.actor('estudiante')
        self.assertEqual(self.client.get(f'/api/alumnos/{self.other.pk}/').status_code,403)

    def test_student_list_scope(self):
        self.actor('estudiante')
        r=self.client.get('/api/alumnos/')
        self.assertEqual([x['id'] for x in r.data['results']],[self.student.pk])

    def test_family_foreign_detail(self):
        self.actor('familia')
        self.assertEqual(self.client.get(f'/api/alumnos/{self.other.pk}/').status_code,403)

    def test_teacher_foreign_grade(self):
        self.actor('profesor')
        r=self.client.post('/api/notas/',{'estudiante':self.other.pk,'materia':self.other_subject.pk,'n1':7})
        self.assertIn(r.status_code,(400,403))
        self.assertEqual(Nota.objects.get(pk=self.note.pk).n1,8)

    def test_teacher_own_grade_persists(self):
        self.actor('profesor')
        r=self.client.post('/api/notas/',{'estudiante':self.student.pk,'materia':self.subject.pk,'n1':7})
        self.assertEqual(r.status_code,201,r.data)
        self.assertEqual(self.client.get(f"/api/notas/{r.data['id']}/").data['n1'],7)

    def test_teacher_foreign_note_read(self):
        self.actor('profesor')
        self.assertEqual(self.client.get(f'/api/notas/{self.note.pk}/').status_code,403)

    def test_teacher_course_scope(self):
        self.actor('profesor')
        self.assertEqual([x['id'] for x in self.client.get('/api/cursos/').data['results']],[self.course.pk])

    def test_teacher_cannot_create_course(self):
        self.actor('profesor')
        self.assertEqual(self.client.post('/api/cursos/',{'año':7,'division':'A'}).status_code,403)

    def test_secretary_cannot_create_admin(self):
        self.actor('secretario')
        p=PersonalStaff.objects.create(nombre='Staff',apellido='Prueba',dni='99000009')
        r=self.client.post(f'/api/personal-staff/{p.pk}/crear-usuario/',{'personal_staff_id':p.pk,'username':'synthetic_admin','password':'Synthetic!Password-4921','rol':'admin'})
        self.assertEqual(r.status_code,403)
        self.assertFalse(User.objects.filter(username='synthetic_admin').exists())

    def test_jefe_cannot_create_director(self):
        self.actor('jefe_area')
        self.assertEqual(self.client.post('/api/usuarios/crear/',{'rol':'director'}).status_code,403)

    def test_cannot_rebind_account(self):
        self.actor('secretario')
        r=self.client.patch(f'/api/alumnos/{self.student.pk}/',{'user':self.users['admin'].pk},format='json')
        self.student.refresh_from_db()
        self.assertEqual(self.student.user_id,self.users['estudiante'].pk)

    def test_cannot_administer_own_account(self):
        self.actor('secretario')
        p=PersonalStaff.objects.create(user=self.users['secretario'],nombre='Staff',apellido='Prueba',dni='99000010')
        self.assertEqual(self.client.patch(f'/api/personal-staff/{p.pk}/',{'cargo':'admin'}).status_code,403)

    def test_notice_wrong_recipient(self):
        c=Comunicado.objects.create(titulo='Docentes solamente',cuerpo='Sintético',tipo_destinatario='Docentes',creado_por=self.users['admin'])
        self.actor('director')
        self.assertNotIn(c.pk,[x['id'] for x in self.client.get('/api/comunicados/').data['results']])

    def test_notice_course_scope(self):
        c=Comunicado.objects.create(titulo='Otro curso',cuerpo='Sintético',tipo_destinatario='CursosEspecificos',cursos_seleccionados=['2° B'],creado_por=self.users['admin'])
        self.actor('estudiante')
        self.assertNotIn(c.pk,[x['id'] for x in self.client.get('/api/comunicados/').data['results']])

    def test_teacher_cannot_create_event(self):
        self.actor('profesor')
        self.assertEqual(self.client.post('/api/eventos/',{'titulo':'Prueba','fecha':'2026-10-02','ciclo':'todos'}).status_code,403)

    def test_teacher_cannot_edit_event(self):
        self.actor('profesor')
        self.assertEqual(self.client.patch(f'/api/eventos/{self.event.pk}/',{'titulo':'Cambio'}).status_code,403)

    def test_teacher_cannot_delete_event(self):
        self.actor('profesor')
        r=self.client.delete(f'/api/eventos/{self.event.pk}/delete/')
        self.assertEqual(r.status_code,403)

    def test_refresh_rotation(self):
        token=str(RefreshToken.for_user(self.users['estudiante']))
        first=self.client.post('/api/login/refresh/',{'refresh':token})
        self.assertEqual(first.status_code,200)
        self.assertNotEqual(token,first.data['refresh'])
        self.assertEqual(self.client.post('/api/login/refresh/',{'refresh':token}).status_code,401)

    def test_loan_no_stock(self):
        self.actor('bibliotecario')
        book=Libro.objects.create(titulo='Sintético',autor='Prueba',copias=1,disponibles=0)
        loan=Prestamo.objects.create(libro=book,usuario=self.users['estudiante'],fecha_prestamo='2026-09-12',fecha_entrega='2026-09-19')
        r=self.client.post(f'/api/prestamos/{loan.pk}/aceptar/')
        self.assertEqual(r.status_code,400)
        self.assertIn('copias',r.data['detail'])
        loan.refresh_from_db()
        self.assertEqual(loan.estado,'Pendiente')

    def test_chat_foreign_group(self):
        self.actor('estudiante')
        group=GrupoChat.objects.create(nombre='Ajeno',creador=self.users['preceptor'])
        r=self.client.post('/api/chat/enviar/',{'grupo':group.pk,'destinatario':self.users['preceptor'].pk,'contenido':'Prueba'})
        self.assertEqual(r.status_code,403)
        self.assertFalse(Mensaje.objects.exists())

    def test_sensitive_apis_need_token(self):
        for path in ('/api/alumnos/','/api/notas/','/api/comunicados/','/api/perfil/'):
            with self.subTest(path=path): self.assertEqual(self.client.get(path).status_code,401)

    def test_profile_contract(self):
        self.actor('profesor')
        self.assertEqual(self.client.get('/api/perfil/').status_code,200)

    def test_phone_exact_create_edit(self):
        self.actor('admin')
        value='+54 9 11 1234-5678 ext 123 '
        r=self.client.post('/api/familias/',{'nombre':'Prueba','apellido':'Teléfono','dni':'99000011','telefono':value})
        self.assertEqual(r.status_code,201,r.data)
        pk=r.data['id']
        self.assertEqual(self.client.get(f'/api/familias/{pk}/').data['telefono'],value)
        value2='+'+'1'*52
        self.assertEqual(self.client.patch(f'/api/familias/{pk}/',{'telefono':value2}).status_code,200)
        self.assertEqual(self.client.get(f'/api/familias/{pk}/').data['telefono'],value2)

    def test_personal_fields_persist(self):
        self.actor('admin')
        payload={'nombre':'Personal','apellido':'Prueba','dni':'99000012','calle':'Calle sintética','numero_calle':'123','identidad_genero':'No binario','telefono':'+54 11 12345678901'}
        r=self.client.post('/api/personal-staff/',payload)
        self.assertEqual(r.status_code,201,r.data)
        self.client.patch(f"/api/personal-staff/{r.data['id']}/",{'calle':'Otra calle','identidad_genero':'Otra'})
        data=self.client.get(f"/api/personal-staff/{r.data['id']}/").data
        self.assertEqual(data['calle'],'Otra calle')
        self.assertEqual(data['identidad_genero'],'Otra')

    def test_attendance_states_persist(self):
        self.actor('preceptor')
        for state in ('Presente','Ausente','Media Falta'):
            r=self.client.post('/api/asistencias-diarias/',{'estudiante':self.student.pk,'fecha':'2026-09-12','estado':state})
            self.assertIn(r.status_code,(200,201),r.data)
            self.assertEqual(AsistenciaDiaria.objects.get(estudiante=self.student,fecha='2026-09-12').estado,state)
        self.actor('familia')
        self.assertEqual(self.client.get('/api/asistencias-diarias/').data['results'][0]['estado'],'Media Falta')

    def test_invalid_attendance(self):
        self.actor('preceptor')
        self.assertEqual(self.client.post('/api/asistencias-diarias/',{'estudiante':self.student.pk,'fecha':'2026-09-12','estado':'Inventado'}).status_code,400)

    def test_cross_attendance(self):
        self.actor('preceptor')
        self.assertEqual(self.client.post('/api/asistencias-diarias/',{'estudiante':self.other.pk,'fecha':'2026-09-12','estado':'Ausente'}).status_code,403)

    def test_student_cannot_write_attendance(self):
        self.actor('estudiante')
        self.assertEqual(self.client.post('/api/asistencias-diarias/',{'estudiante':self.student.pk,'fecha':'2026-09-12'}).status_code,403)

    def test_invalid_grade(self):
        self.assertFalse(NotaSerializer(self.note,data={'n1':999},partial=True).is_valid())

    def test_pagination_page_two(self):
        self.actor('admin')
        for i in range(65):
            Curso.objects.create(año=7,division=f'T{i}')
        r=self.client.get('/api/cursos/')
        self.assertEqual(len(r.data['results']),50)
        second=self.client.get('/api/cursos/?page=2')
        self.assertEqual(len(second.data['results']),17)
        self.assertFalse({x['id'] for x in r.data['results']} & {x['id'] for x in second.data['results']})

    def test_notification_read_persists(self):
        self.actor('estudiante')
        n=Notificacion.objects.create(usuario=self.users['estudiante'],tipo='sistema',titulo='Sintética')
        self.assertEqual(self.client.patch(f'/api/notificaciones/{n.pk}/leer/').status_code,200)
        self.assertEqual(self.client.get('/api/notificaciones/').data['count'],0)
        n.refresh_from_db()
        self.assertTrue(n.leido)

    def test_zero_alerts(self):
        self.actor('admin')
        self.assertEqual(self.client.get('/api/dashboard/stats/').data['alertas_count'],0)

    def test_loan_stock_consumption_return_and_repeat(self):
        book = Libro.objects.create(titulo='Inventario sintético', autor='Prueba', copias=1, disponibles=1)
        loan = Prestamo.objects.create(libro=book, usuario=self.users['estudiante'], fecha_prestamo='2026-09-13', fecha_entrega='2026-09-20')
        self.actor('bibliotecario')
        self.assertEqual(self.client.post(f'/api/prestamos/{loan.pk}/aceptar/').status_code,200)
        self.assertEqual(self.client.post(f'/api/prestamos/{loan.pk}/aceptar/').status_code,400)
        book.refresh_from_db(); self.assertEqual(book.disponibles,0)
        self.assertEqual(self.client.delete(f'/api/prestamos/{loan.pk}/').status_code,400)
        self.assertEqual(self.client.patch(f'/api/prestamos/{loan.pk}/',{'estado':'Devuelto'}).status_code,200)
        self.assertEqual(self.client.patch(f'/api/prestamos/{loan.pk}/',{'estado':'Devuelto'}).status_code,200)
        book.refresh_from_db(); self.assertEqual(book.disponibles,1)

    def test_invalid_book_inventory(self):
        self.actor('bibliotecario')
        self.assertEqual(self.client.post('/api/libros/',{'titulo':'Inválido','autor':'Prueba','copias':1,'disponibles':2}).status_code,400)

    def test_schedule_chain_skips_break(self):
        from usuarios.models import Horario
        source=Horario.objects.create(curso=self.course,materia=self.subject,dia=0,franja=0)
        occupied=Horario.objects.create(curso=self.course,materia=self.subject,dia=0,franja=1)
        self.actor('admin')
        self.assertEqual(self.client.post(f'/api/horarios/{source.pk}/move/',{'dia':0,'franja':1}).status_code,200)
        occupied.refresh_from_db(); source.refresh_from_db()
        self.assertEqual((source.franja,occupied.franja),(1,3))
        self.assertFalse(Horario.objects.filter(curso=self.course,franja=2).exists())
        self.assertEqual(self.client.post(f'/api/horarios/{source.pk}/move/',{'dia':7,'franja':1}).status_code,400)

    def test_group_history_cursor_over_200(self):
        group=GrupoChat.objects.create(nombre='Grupo sintético',creador=self.users['admin'])
        group.miembros.add(self.users['director'],self.users['secretario'])
        Mensaje.objects.bulk_create([Mensaje(grupo=group,remitente=self.users['admin'],contenido=f'Fila {i}') for i in range(205)])
        self.actor('director')
        collected=[]; cursor=None
        for _ in range(5):
            params={'limit':50}
            if cursor:params['before_id']=cursor
            response=self.client.get(f'/api/chat/grupos/{group.pk}/',params)
            self.assertEqual(response.status_code,200)
            collected.extend(row['id'] for row in response.data)
            cursor=min(row['id'] for row in response.data)
        self.assertEqual(len(collected),205)
        self.assertEqual(len(set(collected)),205)

    def test_push_rejects_internal_endpoint(self):
        self.actor('estudiante')
        response=self.client.post('/api/notificaciones/push/subscribe/',{'endpoint':'http://127.0.0.1:8000/api/perfil/','keys':{'p256dh':'synthetic','auth':'synthetic'}},format='json')
        self.assertEqual(response.status_code,400)

    def test_preceptor_numeric_course_assignment(self):
        from usuarios.access import course_ids
        self.prefect.cursos_asignados=str(self.course.pk)
        self.prefect.save()
        self.assertEqual(course_ids(self.users['preceptor']),{self.course.pk})

    def test_book_metadata_round_trip(self):
        self.actor('bibliotecario')
        payload={'titulo':'Persistencia sintética','autor':'Auditoría','isbn':'9780000000000',
                 'editorial':'Pruebas','anio':2026,'categoria':'Ciencias','ubicacion':'A1',
                 'imagen':'https://example.invalid/book.png','copias':2,'disponibles':2}
        response=self.client.post('/api/libros/',payload,format='json')
        self.assertEqual(response.status_code,201,response.data)
        saved=self.client.get(f"/api/libros/{response.data['id']}/").data
        for key,value in payload.items(): self.assertEqual(saved[key],value)

    def test_book_with_loan_cannot_be_deleted(self):
        book=Libro.objects.create(titulo='Historial',autor='Sintético')
        loan=Prestamo.objects.create(libro=book,usuario=self.users['estudiante'],fecha_prestamo='2026-09-13',fecha_entrega='2026-09-20')
        self.actor('bibliotecario')
        self.assertEqual(self.client.delete(f'/api/libros/{book.pk}/').status_code,400)
        self.assertEqual(self.client.post(f'/api/prestamos/{loan.pk}/rechazar/').status_code,200)
        self.assertEqual(self.client.post(f'/api/prestamos/{loan.pk}/aceptar/').status_code,400)
        book.refresh_from_db();self.assertEqual(book.disponibles,1)

    def test_student_phone_shape_and_exact_storage(self):
        self.actor('admin')
        phone='  +54 11 1234 5678  '
        payload={'telefonos_tutores':[{'numero':phone,'tipo':'Tutor'}], 'contacto_emergencia_telefono':phone}
        response=self.client.patch(f'/api/alumnos/{self.student.pk}/',payload,format='json')
        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual(response.data['telefonos_tutores'][0]['numero'],phone)
        self.assertEqual(response.data['contacto_emergencia_telefono'],phone)
        payload['telefonos_tutores']=[{'numero':'1'*54}]
        self.assertEqual(self.client.patch(f'/api/alumnos/{self.student.pk}/',payload,format='json').status_code,400)
