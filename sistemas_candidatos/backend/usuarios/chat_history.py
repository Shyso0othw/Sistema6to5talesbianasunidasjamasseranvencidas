from django.db.models import Q
from rest_framework.exceptions import ValidationError
from .models import Mensaje
from .serializers import MensajeSerializer

def page_messages(queryset, params):
    try:
        limit = max(1, min(int(params.get('limit', 50)), 100))
        before = int(params['before_id']) if params.get('before_id') else None
    except (ValueError, TypeError):
        raise ValidationError('Cursor o límite inválido.')
    if before:
        queryset = queryset.filter(pk__lt=before)
    messages = list(queryset.select_related('remitente','destinatario','grupo').order_by('-pk')[:limit + 1])
    has_more = len(messages) > limit
    return list(MensajeSerializer(list(reversed(messages[:limit])), many=True).data), has_more

def visible_messages(user):
    return Mensaje.objects.filter(Q(grupo__isnull=True) & (Q(remitente=user)|Q(destinatario=user)) |
                                  Q(grupo__creador=user)|Q(grupo__miembros=user)).distinct()
