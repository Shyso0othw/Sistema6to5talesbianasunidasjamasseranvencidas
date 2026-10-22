"""Assignment policy shared by every account provisioning endpoint."""
from rest_framework.exceptions import PermissionDenied, ValidationError
from .permissions import get_user_roles, normalize_role

ALL_ROLES = {'admin','director','vicedirector','secretario','jefe_area','jefe_departamento',
             'jefe_preceptores','profesor','preceptor','estudiante','familia','auxiliar','bibliotecario','ematp','eoe'}
BASE_ROLES = {'profesor','preceptor','estudiante','familia','auxiliar','bibliotecario','ematp','eoe'}
ROLE_ASSIGNMENTS = {
    'admin': ALL_ROLES,
    'director': ALL_ROLES - {'admin','director','vicedirector'},
    'vicedirector': ALL_ROLES - {'admin','director','vicedirector'},
    'secretario': BASE_ROLES,
    'jefe_area': {'profesor','estudiante','familia'},
    'jefe_departamento': {'profesor','estudiante','familia'},
    'jefe_preceptores': {'preceptor','estudiante','familia'},
}

def allowed_assignments(actor):
    if not actor or not actor.is_authenticated or not actor.is_active:
        return set()
    if actor.is_superuser:
        return ALL_ROLES
    return set().union(*(ROLE_ASSIGNMENTS.get(r,set()) for r in get_user_roles(actor)))

def validate_assigned_role(actor, value):
    role = normalize_role(value)
    if role not in ALL_ROLES:
        raise ValidationError({'rol': 'Rol desconocido.'})
    if role not in allowed_assignments(actor):
        raise PermissionDenied('No puede asignar ese rol.')
    return role

def require_target(actor, record):
    target = getattr(record, 'user', None)
    if not target:
        return
    if target.is_superuser and not actor.is_superuser:
        raise PermissionDenied('No puede modificar una cuenta superior.')
    if target.pk == actor.pk:
        raise PermissionDenied('Utilice su perfil para cambios personales; no puede administrar su propia cuenta.')
    if not get_user_roles(target).issubset(allowed_assignments(actor)):
        raise PermissionDenied('No puede modificar una cuenta con ese rol.')
