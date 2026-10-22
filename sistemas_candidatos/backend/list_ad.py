import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from usuarios.models import AsistenciaDiaria

for ad in AsistenciaDiaria.objects.all().values():
    print(ad)
