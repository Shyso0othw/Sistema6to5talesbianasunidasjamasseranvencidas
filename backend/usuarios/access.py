"""Shared server-side scope. Unknown assignments grant no access."""
import logging
import re
from django.db.models import Q
from django.conf import settings
from rest_framework.exceptions import PermissionDenied
from usuarios.models import Alumno, Curso, Docente, Familia
from usuarios.permissions import get_user_roles

ADMIN_ROLES = {'admin','director','vicedirector','secretario'}
HEALTH_FIELDS = {'obra_social','numero_afiliado','grupo_sanguineo','factor_rh','alergias',
    'medicacion','enfermedades_preexistentes','contacto_emergencia_nombre',
    'contacto_emergencia_telefono','observaciones_salud'}

def active(user):
    return bool(user and user.is_authenticated and user.is_active)

def administrative(user):
    return active(user) and (user.is_superuser or bool(get_user_roles(user) & ADMIN_ROLES))

def course_ids(user):
    if not active(user): return set()
    if administrative(user): return set(Curso.objects.values_list('id',flat=True))
    ids = set()
    roles = get_user_roles(user)
    if roles & {'profesor','jefe_area','jefe_departamento'}:
        try:
            d = user.docente
            ids.update(d.cursos_asignados.values_list('id',flat=True))
            ids.update(d.materias.exclude(curso=None).values_list('curso_id',flat=True))
        except Docente.DoesNotExist: pass
    if roles & {'preceptor','jefe_preceptores'}:
        try: raw = user.preceptor.cursos_asignados
        except AttributeError: raw = ''
        # Accept exact existing labels such as 1° A, 1°A, 1 Año A, 1-A.
        for value in raw.split(','):
            if value.strip().isdigit():
                ids.update(Curso.objects.filter(pk=int(value.strip())).values_list('id',flat=True))
        labels = []
        for value in raw.split(','):
            if value.strip().isdigit():
                continue
            match = re.fullmatch(r'\s*(\d+)\s*(?:°|º|[Aa]ño|[-])\s*([A-Za-z0-9]+)\s*', value)
            if match:
                labels.append(match.groups())
        for year,division in labels:
            ids.update(Curso.objects.filter(año=int(year),division__iexact=division).values_list('id',flat=True))
    return ids

def assigned_students(user):
    qs = Alumno.objects.none()
    if administrative(user): return Alumno.objects.all()
    query = Q(pk__in=[])
    for year,division in Curso.objects.filter(pk__in=course_ids(user)).values_list('año','division'):
        query |= Q(año=year,division__iexact=division)
    return Alumno.objects.filter(query)

def visible_students(user):
    if not active(user): return Alumno.objects.none()
    if administrative(user) or get_user_roles(user) & {'eoe'}: return Alumno.objects.all()
    return Alumno.objects.filter(Q(user=user) | Q(familias__user=user) |
        Q(pk__in=assigned_students(user).values('pk'))).distinct()

def academic_scope(user, model):
    qs = model.objects.filter(estudiante__in=visible_students(user))
    if not administrative(user) and get_user_roles(user) & {'profesor','jefe_area','jefe_departamento'}:
        own = Q(estudiante__user=user) | Q(estudiante__familias__user=user)
        if any(f.name == 'materia' for f in model._meta.fields):
            qs = qs.filter(own | Q(materia__docentes__user=user)).distinct()
    return qs

def can_read_health(user, student):
    return active(user) and (user.is_superuser or student.user_id == user.id or
        student.familias.filter(user=user).exists() or bool(get_user_roles(user) & {'admin','director','secretario','eoe'}))

def require_academic_write(user, student, subject=None):
    roles = get_user_roles(user)
    if not administrative(user):
        if not roles & {'profesor','preceptor','jefe_preceptores','jefe_area','jefe_departamento'}:
            raise PermissionDenied('No autorizado para modificar datos académicos.')
        if not assigned_students(user).filter(pk=student.pk).exists():
            raise PermissionDenied('El alumno no pertenece a sus cursos asignados.')
        if subject and roles & {'profesor','jefe_area','jefe_departamento'} and not roles & {'preceptor','jefe_preceptores'}:
            if not subject.docentes.filter(user=user).exists():
                raise PermissionDenied('La materia no está asignada al docente.')
    if subject and (not subject.curso or subject.curso.año != student.año or subject.curso.division.casefold() != student.division.casefold()):
        from rest_framework.exceptions import ValidationError
        raise ValidationError('La materia y el alumno deben pertenecer al mismo curso.')

def audit_change(user, action, obj):
    logging.getLogger('usuarios.audit').info('actor=%s action=%s model=%s object=%s',
        user.pk, action, obj._meta.label, obj.pk)

class ScopedDetailMixin:
    """Return explicit 403 for existing foreign objects, without exposing their data."""
    def get_object(self):
        from django.shortcuts import get_object_or_404
        obj = get_object_or_404(self.serializer_class.Meta.model, pk=self.kwargs['pk'])
        if not self.get_queryset().filter(pk=obj.pk).exists():
            raise PermissionDenied('No tiene acceso a este registro.')
        self.check_object_permissions(self.request,obj)
        return obj

def visible_courses(user):
    if administrative(user) or get_user_roles(user) & {'eoe', 'ematp', 'auxiliar', 'bibliotecario'}:
        return Curso.objects.all()
    query = Q(pk__in=course_ids(user))
    for year, division in visible_students(user).values_list('año', 'division').distinct():
        query |= Q(año=year, division__iexact=division)
    return Curso.objects.filter(query)

class PeopleScopeMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if qs.model == Alumno:
            return qs.filter(pk__in=visible_students(user).values('pk'))
        if administrative(user):
            return qs
        return qs.filter(user=user)

    def perform_update(self, serializer):
        from .account_policy import require_target
        require_target(self.request.user, serializer.instance)
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        from .account_policy import require_target
        from django.db import transaction
        require_target(self.request.user, instance)
        with transaction.atomic():
            account = getattr(instance, 'user', None)
            instance.delete()
            if account:
                account.is_active = False
                account.save(update_fields=['is_active'])
