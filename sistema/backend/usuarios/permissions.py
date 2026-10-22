from rest_framework import permissions
from django.contrib.auth.models import User
from .models import Alumno


def get_user_roles(user):
    """Obtiene todos los roles normalizados del usuario."""
    try:
        perfil = user.perfil
        return {normalize_role(r) for r in perfil.get_all_roles()}
    except Exception:
        return set()


def normalize_role(nombre):
    """Normaliza nombre de rol usando aliases de chat_network."""
    ROLE_ALIASES = {
        'administrador': 'admin',
        'preceptoria': 'preceptor',
        'docente': 'profesor',
        'familias': 'familia',
        'directivo': 'director',
        'vicedirector': 'vicedirector',
        'secretaria': 'secretario',
        'j_preceptores': 'jefe_preceptores',
        'jefe_de_preceptores': 'jefe_preceptores',
        'eoe': 'eoe',
    }
    n = (nombre or '').strip().lower()
    return ROLE_ALIASES.get(n, n)


class RolePermission(permissions.BasePermission):
    """
    Permiso base que verifica roles del usuario.
    Subclases definen `allowed_roles` (set de roles permitidos).
    """

    allowed_roles = set()
    message = 'No tienes permisos para realizar esta acción.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated or not request.user.is_active:
            return False
        if request.user.is_superuser:
            return True
        user_roles = get_user_roles(request.user)
        if 'vicedirector' in user_roles:
            user_roles.add('director')
        return bool(user_roles & self.allowed_roles)


class CanManageUsers(RolePermission):
    """Puede crear/editar/eliminar usuarios (alumnos, docentes, preceptores, familias, personal)."""
    allowed_roles = {
        'admin', 'secretario', 'director', 'directivo',
        'jefe_area', 'jefe_departamento', 'jefe_preceptores',
    }


class CanManagePersonalStaff(RolePermission):
    """Puede gestionar personal staff (directivos, secretaría, auxiliares, etc.)."""
    allowed_roles = {'admin', 'secretario', 'director', 'directivo'}


class CanCreateEvent(RolePermission):
    """Puede crear eventos en el calendario."""
    allowed_roles = {
        'admin', 'secretario', 'director', 'directivo',
        'jefe_area', 'preceptor', 'jefe_preceptores',
        'profesor', 'jefe_departamento',
    }

    def has_permission(self, request, view):
        return super().has_permission(request, view) and 'profesor' not in get_user_roles(request.user)


class CanEditEvent(RolePermission):
    """Puede editar eventos (solo creador o roles admin)."""
    allowed_roles = {
        'admin', 'secretario', 'director', 'directivo',
        'jefe_area', 'jefe_preceptores', 'preceptor',
    }

    def has_permission(self, request, view):
        return super().has_permission(request, view) and 'profesor' not in get_user_roles(request.user)


class CanDeleteEvent(RolePermission):
    """Puede eliminar eventos (solo creador o roles admin)."""
    allowed_roles = {'admin', 'secretario', 'director', 'directivo', 'jefe_area', 'jefe_preceptores'}

    def has_permission(self, request, view):
        return super().has_permission(request, view) and 'profesor' not in get_user_roles(request.user)


class CanManageComunicados(RolePermission):
    """Puede crear/editar/eliminar comunicados."""
    allowed_roles = {
        'preceptor', 'director', 'directivo', 'admin', 'secretario',
        'profesor', 'jefe_area', 'jefe_preceptores', 'jefe_departamento',
    }


class CanViewAllComunicados(RolePermission):
    """Puede ver todos los comunicados (roles administrativos)."""
    allowed_roles = {
        'admin', 'secretario', 'director', 'directivo',
        'jefe_area', 'jefe_preceptores', 'jefe_departamento',
        'preceptor', 'profesor',
    }


class CanManageAcademic(RolePermission):
    """Course/subject scope is additionally enforced by the academic services."""
    allowed_roles = {
        'profesor', 'jefe_preceptores', 'preceptor', 'director', 'directivo', 'admin', 'secretario',
    }


class CanManageHorarios(RolePermission):
    """Puede crear/editar/eliminar horarios."""
    allowed_roles = {
        'admin', 'secretario', 'director', 'directivo',
        'jefe_area', 'jefe_departamento',
    }


class CanViewHorarios(RolePermission):
    """Puede ver horarios (todos los roles autenticados)."""
    allowed_roles = {
        'admin', 'secretario', 'director', 'directivo',
        'jefe_area', 'jefe_departamento', 'jefe_preceptores',
        'preceptor', 'profesor', 'estudiante', 'familia',
        'bibliotecario', 'auxiliar', 'ematp', 'eoe',
    }


class CanManageLibrary(RolePermission):
    """Puede gestionar biblioteca (libros, préstamos)."""
    allowed_roles = {'admin', 'bibliotecario'}


class CanManageAsistenciaPersonal(RolePermission):
    """Puede gestionar asistencias del personal."""
    allowed_roles = {'admin', 'secretario', 'director', 'directivo'}


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permite acceso si el usuario es el dueño del objeto o admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        user_roles = get_user_roles(request.user)
        if 'admin' in user_roles or 'secretario' in user_roles:
            return True
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        if hasattr(obj, 'creado_por') and obj.creado_por == request.user:
            return True
        if hasattr(obj, 'remitente') and obj.remitente == request.user:
            return True
        # Para objetos vinculados a Alumno (notas, asistencias, boletín)
        if hasattr(obj, 'estudiante'):
            try:
                return obj.estudiante.user == request.user
            except Exception:
                pass
        # Para objetos que son el propio Alumno
        if hasattr(obj, 'user') and isinstance(obj, Alumno):
            return obj.user == request.user
        return False


class IsStudentOwnerOrAcademic(permissions.BasePermission):
    """
    Permite acceso si:
    - El usuario es admin/secretario/preceptor/directivo (roles académicos)
    - El usuario es el propio alumno (estudiante)
    - El usuario es familia del alumno
    """

    def has_object_permission(self, request, view, obj):
        from .access import academic_scope, visible_students
        if isinstance(obj, Alumno):
            return visible_students(request.user).filter(pk=obj.pk).exists()
        return academic_scope(request.user, type(obj)).filter(pk=obj.pk).exists()


def check_can_chat(remitente, destinatario):
    """Wrapper para can_chat de chat_network."""
    from .chat_network import can_chat
    return can_chat(remitente, destinatario)


def check_can_chat_group(creador, miembros):
    """Wrapper para can_chat_group de chat_network."""
    from .chat_network import can_chat_group
    return can_chat_group(creador, miembros)

class CanManageCatalog(RolePermission):
    allowed_roles = {'admin', 'secretario', 'director', 'preceptor'}
