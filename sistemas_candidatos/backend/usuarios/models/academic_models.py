from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date
from decimal import Decimal

# Using string references for relations to avoid circular imports (e.g. 'Alumno' instead of Alumno)
class Orientacion(models.Model):
    nombre = models.CharField(max_length=255, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    estado = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'orientacion'
        verbose_name = 'Orientación'
        verbose_name_plural = 'Orientaciones'

    def __str__(self):
        return self.nombre

class Curso(models.Model):
    año = models.IntegerField()
    division = models.CharField(max_length=10)
    carrera = models.CharField(max_length=50, blank=True)
    orientacion = models.ForeignKey('Orientacion', on_delete=models.SET_NULL, null=True, blank=True, related_name='cursos')
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'curso'
        verbose_name_plural = 'Cursos'

    def __str__(self):
        return f"{self.año}° {self.division}"

class Materia(models.Model):
    nombre = models.CharField(max_length=100)
    curso = models.ForeignKey('Curso', on_delete=models.CASCADE, related_name='materias', null=True, blank=True)
    horas = models.IntegerField(default=0)

    class Meta:
        db_table = 'materia'
        verbose_name_plural = 'Materias'

    def __str__(self):
        return self.nombre

class Nota(models.Model):
    estudiante = models.ForeignKey('Alumno', on_delete=models.CASCADE, related_name='notas')
    materia = models.ForeignKey('Materia', on_delete=models.CASCADE, related_name='notas')
    v1 = models.CharField(max_length=50, null=True, blank=True)
    n1 = models.IntegerField(null=True, blank=True)
    vi1 = models.IntegerField(null=True, blank=True, verbose_name='Validación Intensificación 1° C.')
    i1 = models.IntegerField(null=True, blank=True, verbose_name='Intensificación 1° Cuatrimestre')
    v2 = models.CharField(max_length=50, null=True, blank=True)
    n2 = models.IntegerField(null=True, blank=True)
    dic = models.IntegerField(null=True, blank=True)
    feb = models.IntegerField(null=True, blank=True)
    mar = models.IntegerField(null=True, blank=True, verbose_name='Marzo')
    nota_final = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'nota'
        verbose_name = 'Nota'
        verbose_name_plural = 'Notas'
        unique_together = ['estudiante', 'materia']

    def __str__(self):
        return f"{self.estudiante} — {self.materia}"

class Horario(models.Model):
    curso = models.ForeignKey('Curso', on_delete=models.CASCADE, related_name='horarios')
    materia = models.ForeignKey('Materia', on_delete=models.CASCADE, related_name='horarios')
    dia = models.IntegerField(choices=[(0, 'Lunes'), (1, 'Martes'), (2, 'Miércoles'), (3, 'Jueves'), (4, 'Viernes')])
    franja = models.IntegerField()
    aula = models.CharField(max_length=50, blank=True)
    profesor_nombre = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'horario'
        verbose_name_plural = 'Horarios'
        ordering = ['dia', 'franja']

    def __str__(self):
        return f"{self.curso} - {self.materia.nombre} ({self.get_dia_display()} #{self.franja})"

