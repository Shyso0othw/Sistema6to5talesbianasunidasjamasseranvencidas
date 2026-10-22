from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date
from decimal import Decimal

# Using string references for relations to avoid circular imports (e.g. 'Alumno' instead of Alumno)
class Rol(models.Model):
    nombre = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'rol'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.nombre

class Perfil(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    rol = models.ForeignKey('Rol', on_delete=models.PROTECT)
    roles = models.ManyToManyField('Rol', blank=True, related_name='perfiles_extra')

    class Meta:
        db_table = 'perfil'

    def __str__(self):
        return f"{self.user.username} — {self.rol.nombre}"

    def get_all_roles(self):
        """Devuelve todos los roles del usuario (principal + extras) sin duplicados."""
        all_roles = [self.rol.nombre]
        for r in self.roles.all():
            if r.nombre not in all_roles:
                all_roles.append(r.nombre)
        return all_roles

class Notificacion(models.Model):
    TIPOS = [
        ('mensaje', 'Mensaje'),
        ('comunicado', 'Comunicado'),
        ('evento', 'Evento'),
        ('asistencia', 'Asistencia'),
        ('notas', 'Notas'),
        ('alumno', 'Alumno'),
        ('preceptor', 'Preceptor'),
        ('sistema', 'Sistema'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    titulo = models.CharField(max_length=255)
    cuerpo = models.TextField(blank=True)
    leido = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)
    remitente = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='notificaciones_enviadas')
    pendiente = models.BooleanField(default=False, help_text='Notificacion generada mientras la cuenta estaba desactivada')

    class Meta:
        db_table = 'notificacion'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"[{self.tipo}] {self.titulo} → {self.usuario.username}"

class NotificacionPreferencia(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notificacion_preferencia')
    notif_mensaje = models.BooleanField(default=True)
    notif_comunicado = models.BooleanField(default=True)
    notif_evento = models.BooleanField(default=True)
    notif_asistencia = models.BooleanField(default=True)
    notif_notas = models.BooleanField(default=True)
    notif_alumno = models.BooleanField(default=True)
    notif_preceptor = models.BooleanField(default=True)
    cuenta_activa = models.BooleanField(default=True)

    class Meta:
        db_table = 'notificacion_preferencia'
        verbose_name_plural = 'Preferencias de notificaciones'

    def __str__(self):
        return f"Preferencias de {self.usuario.username}"

class PushSubscription(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.URLField(max_length=500)
    p256dh = models.CharField(max_length=256)
    auth = models.CharField(max_length=256)
    user_agent = models.CharField(max_length=500, blank=True, default='')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'push_subscription'
        verbose_name = 'Suscripción Push'
        verbose_name_plural = 'Suscripciones Push'
        unique_together = ('usuario', 'endpoint')

    def __str__(self):
        return f"Push sub {self.usuario.username} ({self.endpoint[:60]}...)"

