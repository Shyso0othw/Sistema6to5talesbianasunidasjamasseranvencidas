from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from django.db import transaction
from usuarios.models import Rol, Perfil


class Command(BaseCommand):
    help = 'Attach the application admin profile to an existing active Django superuser.'

    def add_arguments(self, parser):
        parser.add_argument('username')

    @transaction.atomic
    def handle(self, *args, **options):
        user = User.objects.filter(username=options['username'], is_superuser=True, is_active=True).first()
        if user is None:
            raise CommandError('Primero cree un superusuario activo mediante createsuperuser.')
        role, _ = Rol.objects.get_or_create(nombre='admin')
        profile, created = Perfil.objects.get_or_create(user=user, defaults={'rol':role})
        if not created and profile.rol_id != role.pk:
            raise CommandError('El usuario ya tiene otro perfil. Revíselo explícitamente; no se sobrescribió.')
        self.stdout.write(self.style.SUCCESS('Perfil administrador disponible.'))
