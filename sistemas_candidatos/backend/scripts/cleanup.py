import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from usuarios.models import AsistenciaDiaria
from django.db.models import Count

dups = AsistenciaDiaria.objects.values("estudiante", "fecha").annotate(c=Count("id")).filter(c__gt=1)
count = 0
for d in dups:
    records = list(AsistenciaDiaria.objects.filter(estudiante_id=d["estudiante"], fecha=d["fecha"]).order_by("-id"))
    to_delete = records[1:]  # Keep the most recent one
    count += len(to_delete)
    for r in to_delete:
        r.delete()
        
print(f"Borrados {count} registros duplicados")
