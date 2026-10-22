from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date
from decimal import Decimal

# Using string references for relations to avoid circular imports (e.g. 'Alumno' instead of Alumno)
class Alumno(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='alumno', null=True, blank=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    dni = models.CharField(max_length=20, unique=True)
    cuil = models.CharField(max_length=20, blank=True)
    fecha_nacimiento = models.DateField()
    año = models.IntegerField()
    division = models.CharField(max_length=10)
    grupo = models.CharField(max_length=1, choices=[('A', 'A'), ('B', 'B')], default='A', blank=True)
    calle = models.CharField(max_length=100, blank=True, null=True)
    numero_calle = models.CharField(max_length=20, blank=True, null=True)
    entre_calles = models.CharField(max_length=100, blank=True, null=True)
    tipo_vivienda = models.CharField(max_length=50, blank=True, null=True)
    piso = models.CharField(max_length=20, blank=True, null=True)
    letra_edificio = models.CharField(max_length=10, blank=True, null=True)
    letra_ph = models.CharField(max_length=10, blank=True, null=True)
    municipio = models.CharField(max_length=100, blank=True, null=True)
    
    telefonos_tutores = models.JSONField(default=list, blank=True)
    email = models.EmailField(blank=True)
    observaciones = models.TextField(blank=True)
    lugar_nacimiento = models.CharField(max_length=100, blank=True)
    nacionalidad = models.CharField(max_length=50, blank=True, default='Argentina')
    localidad = models.CharField(max_length=100, blank=True)
    partido = models.CharField(max_length=100, blank=True)
    sexo = models.CharField(max_length=20, blank=True)
    identidad_genero = models.CharField(max_length=20, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    # Ficha de Salud
    obra_social = models.CharField(max_length=100, blank=True)
    numero_afiliado = models.CharField(max_length=50, blank=True)
    grupo_sanguineo = models.CharField(max_length=10, blank=True)
    factor_rh = models.CharField(max_length=10, blank=True)
    alergias = models.TextField(blank=True)
    medicacion = models.TextField(blank=True)
    enfermedades_preexistentes = models.TextField(blank=True)
    contacto_emergencia_nombre = models.CharField(max_length=100, blank=True)
    contacto_emergencia_telefono = models.CharField(max_length=53, blank=True)
    observaciones_salud = models.TextField(blank=True)

    class Meta:
        db_table = 'alumno'
        verbose_name_plural = 'Alumnos'

    def __str__(self):
        return f"{self.apellido}, {self.nombre} — {self.año}° {self.division}"

class Docente(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='docente', null=True, blank=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    dni = models.CharField(max_length=20, unique=True)
    cuil = models.CharField(max_length=20, blank=True)
    fecha_nacimiento = models.DateField()
    calle = models.CharField(max_length=100, blank=True, null=True)
    numero_calle = models.CharField(max_length=20, blank=True, null=True)
    entre_calles = models.CharField(max_length=100, blank=True, null=True)
    tipo_vivienda = models.CharField(max_length=50, blank=True, null=True)
    piso = models.CharField(max_length=20, blank=True, null=True)
    letra_edificio = models.CharField(max_length=10, blank=True, null=True)
    letra_ph = models.CharField(max_length=10, blank=True, null=True)
    municipio = models.CharField(max_length=100, blank=True, null=True)
    telefono = models.CharField(max_length=53, blank=True)
    email = models.EmailField(blank=True)
    identidad_genero = models.CharField(max_length=20, blank=True)
    materia = models.CharField(max_length=100, blank=True)
    cargo = models.CharField(max_length=50, blank=True)
    departamento = models.CharField(max_length=100, blank=True)
    materias = models.ManyToManyField('Materia', blank=True, related_name='docentes')
    cursos_asignados = models.ManyToManyField('Curso', blank=True, related_name='docentes_asignados')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'docente'
        verbose_name_plural = 'Docentes'

    def __str__(self):
        return f"{self.apellido}, {self.nombre}"

class Preceptor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preceptor', null=True, blank=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    dni = models.CharField(max_length=20, unique=True)
    cuil = models.CharField(max_length=20, blank=True)
    fecha_nacimiento = models.DateField()
    calle = models.CharField(max_length=100, blank=True, null=True)
    numero_calle = models.CharField(max_length=20, blank=True, null=True)
    entre_calles = models.CharField(max_length=100, blank=True, null=True)
    tipo_vivienda = models.CharField(max_length=50, blank=True, null=True)
    piso = models.CharField(max_length=20, blank=True, null=True)
    letra_edificio = models.CharField(max_length=10, blank=True, null=True)
    letra_ph = models.CharField(max_length=10, blank=True, null=True)
    municipio = models.CharField(max_length=100, blank=True, null=True)
    telefono = models.CharField(max_length=53, blank=True)
    email = models.EmailField(blank=True)
    turno = models.CharField(max_length=100, blank=True)
    cursos_asignados = models.CharField(max_length=200, blank=True)
    lugar_nacimiento = models.CharField(max_length=100, blank=True)
    nacionalidad = models.CharField(max_length=50, blank=True, default='Argentina')
    localidad = models.CharField(max_length=100, blank=True)
    partido = models.CharField(max_length=100, blank=True)
    sexo = models.CharField(max_length=20, blank=True)
    identidad_genero = models.CharField(max_length=20, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'preceptor'
        verbose_name_plural = 'Preceptores'

    def __str__(self):
        return f"{self.apellido}, {self.nombre}"

class Familia(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='familia', null=True, blank=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    dni = models.CharField(max_length=20, unique=True)
    cuil = models.CharField(max_length=20, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    lugar_nacimiento = models.CharField(max_length=100, blank=True)
    nacionalidad = models.CharField(max_length=50, blank=True, default='Argentina')
    sexo = models.CharField(max_length=20, blank=True)
    identidad_genero = models.CharField(max_length=20, blank=True)
    estado_civil = models.CharField(max_length=30, blank=True)
    ocupacion = models.CharField(max_length=100, blank=True)
    calle = models.CharField(max_length=100, blank=True, null=True)
    numero_calle = models.CharField(max_length=20, blank=True, null=True)
    entre_calles = models.CharField(max_length=100, blank=True, null=True)
    tipo_vivienda = models.CharField(max_length=50, blank=True, null=True)
    piso = models.CharField(max_length=20, blank=True, null=True)
    letra_edificio = models.CharField(max_length=10, blank=True, null=True)
    letra_ph = models.CharField(max_length=10, blank=True, null=True)
    municipio = models.CharField(max_length=100, blank=True, null=True)
    localidad = models.CharField(max_length=100, blank=True)
    partido = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=53, blank=True)
    email = models.EmailField(blank=True)
    relacion = models.CharField(max_length=50, blank=True)
    observaciones = models.TextField(blank=True)
    alumnos = models.ManyToManyField('Alumno', blank=True, related_name='familias')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'familia'
        verbose_name_plural = 'Familias'

    def __str__(self):
        return f"{self.apellido}, {self.nombre}"

class PersonalStaff(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='personal_staff', null=True, blank=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    dni = models.CharField(max_length=20, unique=True)
    cuil = models.CharField(max_length=20, blank=True)
    telefono = models.CharField(max_length=53, blank=True)
    email = models.EmailField(blank=True)
    identidad_genero = models.CharField(max_length=20, blank=True)
    lugar_nacimiento = models.CharField(max_length=100, blank=True)
    nacionalidad = models.CharField(max_length=50, blank=True, default='Argentina')
    fecha_nacimiento = models.DateField(null=True, blank=True)
    sexo = models.CharField(max_length=20, blank=True)
    estado_civil = models.CharField(max_length=30, blank=True)
    calle = models.CharField(max_length=100, blank=True, null=True)
    numero_calle = models.CharField(max_length=20, blank=True, null=True)
    entre_calles = models.CharField(max_length=100, blank=True, null=True)
    tipo_vivienda = models.CharField(max_length=50, blank=True, null=True)
    piso = models.CharField(max_length=20, blank=True, null=True)
    letra_edificio = models.CharField(max_length=10, blank=True, null=True)
    letra_ph = models.CharField(max_length=10, blank=True, null=True)
    municipio = models.CharField(max_length=100, blank=True, null=True)
    localidad = models.CharField(max_length=100, blank=True)
    partido = models.CharField(max_length=100, blank=True)
    # Contacto específico para directivo
    email_abc = models.EmailField(blank=True)
    # Datos laborales (directivo)
    codigo_asi = models.CharField(max_length=50, blank=True)
    codigo_esp = models.CharField(max_length=50, blank=True)
    fecha_ingreso = models.DateField(null=True, blank=True)
    cargo = models.CharField(max_length=100, blank=True)
    cargo_al_ingresar = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=30, blank=True)
    tipo_listado = models.CharField(max_length=50, blank=True)
    tipo_listado_al_ingresar = models.CharField(max_length=50, blank=True)
    situacion_revista = models.CharField(max_length=50, blank=True)
    reemplaza_a = models.CharField(max_length=100, blank=True)
    tipo_licencia = models.CharField(max_length=50, blank=True)
    motivo_licencia = models.TextField(blank=True)
    fecha_inicio_licencia = models.DateField(null=True, blank=True)
    fecha_fin_licencia = models.DateField(null=True, blank=True)
    titulos_habilitantes = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'personal_staff'
        verbose_name_plural = 'Personal Staff'

    def __str__(self):
        return f"{self.apellido}, {self.nombre}"

