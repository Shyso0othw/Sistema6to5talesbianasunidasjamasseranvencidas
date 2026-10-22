from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date
from decimal import Decimal

# Using string references for relations to avoid circular imports (e.g. 'Alumno' instead of Alumno)
class AsistenciaPersonal(models.Model):
    CARGO_CHOICES = [
        ('Profesor', 'Profesor'), ('Preceptor', 'Preceptor'), ('Auxiliar', 'Auxiliar'),
        ('Secretaria', 'Secretaria'), ('Vicedirector', 'Vicedirector'), ('Director', 'Director'),
        ('Bibliotecario','Bibliotecario'), ('EOE','EOE'), ('EMATP','EMATP'),
        ('Jefe de Preceptores','Jefe de Preceptores'), ('Jefe de Área','Jefe de Área'), ('Jefe de Departamento','Jefe de Departamento'),
    ]
    ESTADO_CHOICES = [('Activo', 'Activo'), ('Licencia', 'Licencia'), ('Suspendido', 'Suspendido'), ('Inactivo', 'Inactivo')]
    TURNO_CHOICES = [('Mañana', 'Mañana'), ('Tarde', 'Tarde'), ('Vespertino', 'Vespertino')]
    DIA_CHOICES = [('Lunes', 'Lunes'), ('Martes', 'Martes'), ('Miercoles', 'Miercoles'), ('Jueves', 'Jueves'), ('Viernes', 'Viernes')]

    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    codigo = models.CharField(max_length=50)
    cargo = models.CharField(max_length=30, choices=CARGO_CHOICES)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='Activo')
    motivo = models.CharField(max_length=200, blank=True)
    turno = models.CharField(max_length=20, choices=TURNO_CHOICES)
    dia = models.CharField(max_length=20, choices=DIA_CHOICES)
    hora_entrada = models.TimeField()
    hora_salida = models.TimeField(null=True, blank=True)
    firma = models.BooleanField(default=False)
    fecha = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'asistencia_personal'
        verbose_name_plural = 'Asistencia del Personal'

    def __str__(self):
        return f"{self.apellido}, {self.nombre} — {self.cargo}"

class Asistencia(models.Model):
    estudiante = models.ForeignKey('Alumno', on_delete=models.CASCADE, related_name='asistencias')
    materia = models.ForeignKey('Materia', on_delete=models.CASCADE, related_name='asistencias')
    presentes = models.IntegerField(default=0)
    ausentes = models.IntegerField(default=0)
    justificadas = models.IntegerField(default=0)
    injustificadas = models.IntegerField(default=0)
    tardes = models.IntegerField(default=0)
    total = models.IntegerField(default=0)

    class Meta:
        db_table = 'asistencia'
        verbose_name = 'Asistencia'
        verbose_name_plural = 'Asistencias'
        unique_together = ['estudiante', 'materia']

    @property
    def porcentaje(self):
        if self.total == 0:
            return 0
        return round((self.presentes / self.total) * 100)

    def __str__(self):
        return f"{self.estudiante} — {self.materia}: {self.porcentaje}%"

class AsistenciaDiaria(models.Model):
    ESTADOS = [
        ('Presente', 'Presente'),
        ('Ausente', 'Ausente'),
        ('Tarde', 'Tarde'),
        ('Justificado', 'Justificado'),
        ('Media Falta', 'Media Falta'),
    ]
    estudiante = models.ForeignKey('Alumno', on_delete=models.CASCADE, related_name='asistencias_diarias')
    fecha = models.DateField(default=timezone.now)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='Presente')

    class Meta:
        db_table = 'asistencia_diaria'
        verbose_name = 'Asistencia Diaria'
        verbose_name_plural = 'Asistencias Diarias'
        unique_together = ['estudiante', 'fecha']

    def __str__(self):
        return f"{self.estudiante} - {self.fecha} - {self.estado}"

