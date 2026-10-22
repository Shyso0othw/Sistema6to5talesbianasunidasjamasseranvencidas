from io import StringIO
from unittest.mock import patch
from django.core.management import call_command, CommandError
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from usuarios.models import Alumno, Curso, Mensaje


@override_settings(DEBUG=True, PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class SeedTests(TestCase):
    def test_repeat_does_not_duplicate_or_reset_edited_records(self):
        with patch.dict('os.environ', {'DJANGO_ENV':'development','DJANGO_SETTINGS_MODULE':'backend.settings_test'}):
            call_command('seed_test_data', stdout=StringIO())
            before=(User.objects.count(), Alumno.objects.count(), Curso.objects.count(), Mensaje.objects.count())
            student=Alumno.objects.first()
            student.calle='Edición manual conservada';student.save()
            call_command('seed_test_data', stdout=StringIO())
            self.assertEqual(before,(User.objects.count(), Alumno.objects.count(), Curso.objects.count(), Mensaje.objects.count()))
            student.refresh_from_db();self.assertEqual(student.calle,'Edición manual conservada')

    def test_production_and_staging_are_blocked(self):
        for environment in ['staging','production']:
            with patch.dict('os.environ',{'DJANGO_ENV':environment}):
                with self.assertRaises(CommandError):call_command('seed_test_data',stdout=StringIO())
        self.assertEqual(User.objects.count(),0)
