from rest_framework import serializers
from django.db.models import Q, Sum, F
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone
from usuarios.models import *

class OrientacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Orientacion
        fields = '__all__'

class CursoSerializer(serializers.ModelSerializer):
    orientacion_nombre = serializers.CharField(source='orientacion.nombre', read_only=True)

    class Meta:
        model = Curso
        fields = '__all__'

class MateriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Materia
        fields = '__all__'

class HorarioSerializer(serializers.ModelSerializer):
    curso_nombre = serializers.SerializerMethodField()
    materia_nombre = serializers.CharField(source='materia.nombre', read_only=True)

    class Meta:
        model = Horario
        fields = '__all__'
        read_only_fields = ['id']

    def get_curso_nombre(self, obj):
        try:
            return str(obj.curso)
        except Exception:
            return None

    def validate(self, data):
        # Obtener franja y curso (soportar create y update parcial)
        franja = data.get('franja') if 'franja' in data else (getattr(self.instance, 'franja', None) if hasattr(self, 'instance') else None)
        curso = data.get('curso') if 'curso' in data else (getattr(self.instance, 'curso', None) if hasattr(self, 'instance') else None)

        if franja is None or curso is None:
            return data

        try:
            año = int(getattr(curso, 'año', getattr(curso, 'anio', 0)))
        except Exception:
            año = 0

        # Definición de franjas (coincide con frontend/src/pages/horarioUtils.js)
        FRANJAS_CB = [
            {'inicio': '07:45', 'fin': '08:45'},
            {'inicio': '08:45', 'fin': '09:45'},
            {'inicio': '09:45', 'fin': '10:00', 'tipo': 'recreo'},
            {'inicio': '10:00', 'fin': '11:00'},
            {'inicio': '11:00', 'fin': '12:00'},
            {'inicio': '12:00', 'fin': '13:10', 'tipo': 'receso'},
            {'inicio': '13:10', 'fin': '14:10'},
            {'inicio': '14:10', 'fin': '15:10'},
            {'inicio': '15:10', 'fin': '15:25', 'tipo': 'recreo'},
            {'inicio': '15:25', 'fin': '16:25'},
            {'inicio': '16:25', 'fin': '17:25'},
            {'inicio': '17:25', 'fin': '18:25'},
            {'inicio': '18:25', 'fin': '19:25'},
            {'inicio': '19:25', 'fin': '20:25'},
            {'inicio': '20:25', 'fin': '21:25'},
        ]

        FRANJAS_CS = [
            {'inicio': '07:45', 'fin': '08:45'},
            {'inicio': '08:45', 'fin': '08:55', 'tipo': 'recreo'},
            {'inicio': '08:55', 'fin': '09:55'},
            {'inicio': '09:55', 'fin': '10:55'},
            {'inicio': '10:55', 'fin': '11:05', 'tipo': 'recreo'},
            {'inicio': '11:05', 'fin': '12:05'},
            {'inicio': '12:05', 'fin': '13:10', 'tipo': 'receso'},
            {'inicio': '13:10', 'fin': '14:10'},
            {'inicio': '14:10', 'fin': '14:20', 'tipo': 'recreo'},
            {'inicio': '14:20', 'fin': '15:20'},
            {'inicio': '15:20', 'fin': '16:20'},
            {'inicio': '16:20', 'fin': '16:30', 'tipo': 'recreo'},
            {'inicio': '16:30', 'fin': '17:30'},
            {'inicio': '17:30', 'fin': '18:30'},
            {'inicio': '18:30', 'fin': '18:40', 'tipo': 'recreo'},
            {'inicio': '18:40', 'fin': '19:40'},
            {'inicio': '19:40', 'fin': '20:40'},
            {'inicio': '20:40', 'fin': '20:50', 'tipo': 'recreo'},
            {'inicio': '20:50', 'fin': '21:50'},
        ]

        franjas = FRANJAS_CS if año >= 4 else FRANJAS_CB

        if not (0 <= franja < len(franjas)):
            raise serializers.ValidationError({'franja': 'Franja fuera de rango'})

        tipo = franjas[franja].get('tipo')
        if tipo in ('recreo', 'receso'):
            raise serializers.ValidationError({'franja': 'No se permiten horarios en franjas de recreo/receso'})

        # --- Validación de solapamiento ---
        dia = data.get('dia') if 'dia' in data else (getattr(self.instance, 'dia', None) if hasattr(self, 'instance') else None)
        if dia is not None:
            exclude_pk = self.instance.pk if self.instance else None
            base_qs = Horario.objects.filter(dia=dia, franja=franja)
            if exclude_pk:
                base_qs = base_qs.exclude(pk=exclude_pk)

            # 1) Mismo curso + dia + franja
            if base_qs.filter(curso=curso).exists():
                raise serializers.ValidationError({
                    'franja': f'Ya existe un horario para este curso en ese día y franja.'
                })

            # 2) Mismo profesor + dia + franja
            profesor_nombre = data.get('profesor_nombre') if 'profesor_nombre' in data else (getattr(self.instance, 'profesor_nombre', '') if hasattr(self, 'instance') else '')
            if profesor_nombre and profesor_nombre.strip():
                if base_qs.filter(profesor_nombre__iexact=profesor_nombre.strip()).exists():
                    raise serializers.ValidationError({
                        'profesor_nombre': f'El profesor "{profesor_nombre.strip()}" ya tiene un horario en ese día y franja.'
                    })

            # 3) Misma aula + dia + franja
            aula = data.get('aula') if 'aula' in data else (getattr(self.instance, 'aula', '') if hasattr(self, 'instance') else '')
            if aula and aula.strip():
                if base_qs.filter(aula__iexact=aula.strip()).exists():
                    raise serializers.ValidationError({
                        'aula': f'El aula "{aula.strip()}" ya está ocupada en ese día y franja.'
                    })

        return data

class NotaSerializer(serializers.ModelSerializer):
    materia_nombre = serializers.CharField(source='materia.nombre', read_only=True)
    estudiante_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Nota
        fields = '__all__'
        read_only_fields = ['id']

    def get_estudiante_nombre(self, obj):
        return f"{obj.estudiante.apellido}, {obj.estudiante.nombre}"

    def validate(self, data):
        for key in ('n1','n2','vi1','i1','dic','feb','mar','nota_final'):
            if data.get(key) is not None and not 1 <= data[key] <= 10:
                raise serializers.ValidationError({key: 'La calificación debe estar entre 1 y 10.'})
        student = data.get('estudiante', getattr(self.instance, 'estudiante', None))
        subject = data.get('materia', getattr(self.instance, 'materia', None))
        if student and subject and (not subject.curso or subject.curso.año != student.año or subject.curso.division != student.division):
            raise serializers.ValidationError('Alumno y materia deben pertenecer al mismo curso.')
        return data

