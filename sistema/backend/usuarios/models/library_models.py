from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date
from decimal import Decimal

# Using string references for relations to avoid circular imports (e.g. 'Alumno' instead of Alumno)
class Libro(models.Model):
    titulo = models.CharField(max_length=255)
    autor = models.CharField(max_length=255)
    isbn = models.CharField(max_length=32, blank=True)
    editorial = models.CharField(max_length=255, blank=True)
    anio = models.PositiveSmallIntegerField(null=True, blank=True)
    categoria = models.CharField(max_length=255, blank=True)
    ubicacion = models.CharField(max_length=255, blank=True)
    imagen = models.URLField(max_length=1000, blank=True)
    copias = models.IntegerField(default=1)
    disponibles = models.IntegerField(default=1)

    class Meta:
        db_table = 'libro'
        verbose_name_plural = 'Libros'

    def __str__(self):
        return f"{self.titulo} — {self.autor}"

class Prestamo(models.Model):
    ESTADO_CHOICES = [
        ('Solicitado', 'Solicitado'),
        ('Pendiente', 'Pendiente'),
        ('Al dia', 'Al día'),
        ('En posesion', 'En posesión'),
        ('Demorado', 'Demorado'),
        ('Devuelto', 'Devuelto'),
        ('Rechazado', 'Rechazado'),
    ]
    libro = models.ForeignKey('Libro', on_delete=models.CASCADE, related_name='prestamos')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prestamos')
    fecha_prestamo = models.DateField()
    fecha_entrega = models.DateField()
    hora_desde = models.TimeField(null=True, blank=True)
    hora_hasta = models.TimeField(null=True, blank=True)
    dias = models.CharField(max_length=200, blank=True)
    curso_materia = models.CharField(max_length=200, blank=True)
    solicitante = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='solicitudes_prestamo')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='Pendiente')

    class Meta:
        db_table = 'prestamo'
        verbose_name_plural = 'Prestamos'

    def __str__(self):
        return f"{self.libro.titulo} → {self.usuario.username}"

