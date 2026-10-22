"""One recipient policy for API lists, details, sockets and notifications."""
from django.db.models import Q
from django.utils import timezone
from .models import Alumno, Curso, Comunicado, Evento
from .permissions import get_user_roles
from .access import course_ids

TARGETS = {'todos': 'all', 'Todos': 'all', 'docentes': 'teacher', 'Docentes': 'teacher',
           'preceptores': 'prefect', 'Preceptores': 'prefect', 'alumnos': 'student',
           'Estudiantes': 'student', 'familias': 'family', 'Familias': 'family',
           'auxiliares': 'support', 'Auxiliares': 'support', 'basico': 'basic',
           'CicloBasico': 'basic', 'superior': 'upper', 'CicloSuperior': 'upper',
           'cursos': 'courses', 'CursosEspecificos': 'courses'}

def label(value):
    return str(value).replace('º','°').replace(' ','').lower()

def assignments(user):
    pairs = set(Curso.objects.filter(pk__in=course_ids(user)).values_list('año','division'))
    pairs.update(Alumno.objects.filter(Q(user=user)|Q(familias__user=user)).values_list('año','division'))
    return pairs

def receives(user, obj):
    if not user.is_active:
        return False
    roles = get_user_roles(user)
    if user.is_superuser or 'admin' in roles or obj.creado_por_id == user.pk:
        return True
    if isinstance(obj, Comunicado) and obj.fecha_publicacion and obj.fecha_publicacion > timezone.localdate():
        return False
    raw = obj.tipo_destinatario if isinstance(obj, Comunicado) else (obj.ciclo or '')
    selected = obj.cursos_seleccionados if isinstance(obj, Comunicado) else (obj.curso or '').split(',')
    targets = {TARGETS.get(t.strip()) for t in raw.split(',')}
    if 'all' in targets:
        return True
    role_targets = {'teacher': {'profesor','jefe_area','jefe_departamento'},
                    'prefect': {'preceptor','jefe_preceptores'},'student': {'estudiante'},
                    'family': {'familia'},'support': {'auxiliar','ematp'}}
    if any(target in targets and roles & allowed for target, allowed in role_targets.items()):
        return True
    pairs = assignments(user) if targets & {'basic','upper','courses'} else set()
    if roles & {'estudiante','familia'}:
        if 'basic' in targets and any(y <= 3 for y,d in pairs): return True
        if 'upper' in targets and any(y >= 4 for y,d in pairs): return True
    return 'courses' in targets and bool({label(f'{y}°{d}') for y,d in pairs} & {label(v) for v in selected})

def visible(user, model):
    qs = model.objects.select_related('creado_por').all()
    return qs.filter(pk__in=[obj.pk for obj in qs if receives(user, obj)])

def validate_audience(data, instance=None):
    from rest_framework.exceptions import ValidationError
    is_notice = 'tipo_destinatario' in data or isinstance(instance, Comunicado)
    field = 'tipo_destinatario' if is_notice else 'ciclo'
    raw = data.get(field, getattr(instance, field, '')) or ''
    parts = [v.strip() for v in raw.split(',') if v.strip()]
    if not parts or any(v not in TARGETS for v in parts):
        raise ValidationError({field: 'Seleccione destinatarios válidos.'})
    if any(TARGETS[v] == 'courses' for v in parts):
        key = 'cursos_seleccionados' if is_notice else 'curso'
        selected = data.get(key, getattr(instance, key, []))
        values = selected if isinstance(selected,list) else (selected or '').split(',')
        valid = {label(f'{y}°{d}') for y,d in Curso.objects.values_list('año','division')}
        if not values or any(label(v) not in valid for v in values):
            raise ValidationError({key: 'Seleccione cursos existentes.'})
