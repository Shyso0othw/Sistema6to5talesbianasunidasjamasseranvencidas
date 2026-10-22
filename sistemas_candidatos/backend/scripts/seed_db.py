import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from usuarios.models import Materia, Rol

def run():
    print("Seeding database...")
    
    # 1. Ensure Roles exist
    roles_to_create = [
        'jefe_preceptores', 
        'jefe_area', 
        'jefe_departamento',
        'estudiante',
        'docente',
        'preceptor',
        'familia',
        'directivo',
        'secretaria',
        'auxiliar',
        'bibliotecario',
        'eoe',
        'ematp'
    ]
    
    for r in roles_to_create:
        Rol.objects.get_or_create(nombre=r)
    print("Roles creados o verificados.")

    # 2. Recreate Materias
    materias_reales = [
        "Matemática", 
        "Prácticas del lenguaje", 
        "Química", 
        "Física", 
        "Matemática discreta", 
        "Análisis matemático", 
        "Biología", 
        "Ciencias sociales", 
        "Ciencias naturales", 
        "Educación física", 
        "Salud y adolescencia", 
        "Ciudadanía", 
        "Política", 
        "Filosofía", 
        "Sistemas digitales", 
        "Procedimientos técnicos", 
        "Lenguaje tecnológico", 
        "Sistemas tecnológicos", 
        "Artística", 
        "Arte", 
        "Procedimientos industriales", 
        "Laboratorio de hardware", 
        "Laboratorio de sistemas operativos", 
        "Laboratorio de programación", 
        "Laboratorio de base de datos", 
        "Base de datos", 
        "Desarrollo de aplicaciones web", 
        "Desarrollo de aplicaciones web dinámicas", 
        "Desarrollo de aplicaciones web estáticas", 
        "Inglés", 
        "Seguridad informática", 
        "Gestión y autogestión"
    ]
    
    # Optional: Delete existing materias to avoid duplicates/mess (implicit from user request)
    Materia.objects.all().delete()
    
    for m_name in materias_reales:
        Materia.objects.create(nombre=m_name)
        
    print(f"Creadas {len(materias_reales)} materias reales.")
    print("Seed completado.")

if __name__ == '__main__':
    run()
