from unittest.mock import patch
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from usuarios.models import Rol, Perfil

class LocalValidationTests(TestCase):
    def test_book_edit_cannot_release_a_copy_on_loan(self):
        from usuarios.models import Libro, Prestamo
        from usuarios.serializers.library_serializers import LibroSerializer
        from rest_framework.exceptions import ValidationError
        user = User.objects.create_user('inventory_reader')
        book = Libro.objects.create(titulo='Inventario', autor='Sintético', copias=2, disponibles=1)
        Prestamo.objects.create(libro=book, usuario=user, estado='Al dia',
                               fecha_prestamo='2026-09-14', fecha_entrega='2026-09-21')
        serializer = LibroSerializer(book, data={'disponibles': 2}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with self.assertRaises(ValidationError):
            serializer.save()
        book.refresh_from_db()
        self.assertEqual(book.disponibles, 1)
        serializer = LibroSerializer(book, data={'ubicacion': 'B2'}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        book.refresh_from_db()
        self.assertEqual(book.ubicacion, 'B2')

    @override_settings(DEBUG=True,CHANNEL_LAYERS={'default':{'BACKEND':'channels.layers.InMemoryChannelLayer'}})
    def test_health_does_not_certify_redis_from_configuration(self):
        response=APIClient().get('/api/health/')
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data['checks']['redis']['status'],'not_tested')

    def test_vice_director_scope_without_admin_escalation(self):
        from usuarios.access import administrative
        from usuarios.account_policy import allowed_assignments
        from usuarios.permissions import CanManageUsers
        from rest_framework.test import APIRequestFactory, force_authenticate
        user=User.objects.create_user('vice_scope')
        Perfil.objects.create(user=user,rol=Rol.objects.get_or_create(nombre='vicedirector')[0])
        self.assertTrue(administrative(user))
        self.assertNotIn('admin',allowed_assignments(user))
        self.assertNotIn('director',allowed_assignments(user))
        client=APIClient();client.force_authenticate(user)
        self.assertEqual(client.get('/api/alumnos/').status_code,200)
