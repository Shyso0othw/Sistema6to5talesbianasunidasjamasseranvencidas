from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date
from decimal import Decimal

# Using string references for relations to avoid circular imports (e.g. 'Alumno' instead of Alumno)
class Evento(models.Model):
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    fecha = models.DateField()
    hora_inicio = models.TimeField(null=True, blank=True)
    hora_fin = models.TimeField(null=True, blank=True)
    lugar = models.CharField(max_length=120, blank=True, null=True)
    ciclo = models.CharField(max_length=255, blank=True, null=True)
    curso = models.CharField(max_length=255, blank=True, null=True)
    tipo = models.CharField(max_length=50, blank=True, null=True)
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='eventos_creados')

    class Meta:
        db_table = 'evento'
        verbose_name = 'Evento'
        verbose_name_plural = 'Eventos'

    def __str__(self):
        return f"{self.titulo} ({self.fecha})"

class GrupoChat(models.Model):
    nombre = models.CharField(max_length=100)
    creador = models.ForeignKey(User, on_delete=models.CASCADE, related_name='grupos_creados')
    miembros = models.ManyToManyField(User, related_name='grupos_chat')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'grupo_chat'
        verbose_name_plural = 'Grupos de Chat'

    def __str__(self):
        return self.nombre

class Mensaje(models.Model):
    remitente = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mensajes_enviados')
    destinatario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mensajes_recibidos', null=True, blank=True)
    grupo = models.ForeignKey('GrupoChat', on_delete=models.CASCADE, related_name='mensajes', null=True, blank=True)
    contenido = models.TextField()
    leido = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mensaje'
        verbose_name_plural = 'Mensajes'
        ordering = ['fecha_creacion']

    def __str__(self):
        dest = self.destinatario.username if self.destinatario else f"Grupo {self.grupo.nombre}"
        return f"{self.remitente.username} → {dest}: {self.contenido[:50]}"

class Comunicado(models.Model):
    TIPO_DESTINATARIO = [
        ('Todos', 'Todos'),
        ('Docentes', 'Docentes'),
        ('Preceptores', 'Preceptores'),
        ('Estudiantes', 'Estudiantes'),
        ('Familias', 'Familias'),
        ('CicloBasico', 'Ciclo Básico'),
        ('CicloSuperior', 'Ciclo Superior'),
        ('CursosEspecificos', 'Cursos Específicos'),
    ]

    titulo = models.CharField(max_length=255)
    cuerpo = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    fecha_publicacion = models.DateField(null=True, blank=True)
    creado_por = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comunicados_creados')
    tipo_destinatario = models.CharField(max_length=255, default='Todos')
    cursos_seleccionados = models.JSONField(default=list, blank=True, help_text='Lista de cursos seleccionados (ej: ["1°A", "2°B"])')

    class Meta:
        db_table = 'comunicado'
        verbose_name_plural = 'Comunicados'
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.titulo} → {self.tipo_destinatario}"

