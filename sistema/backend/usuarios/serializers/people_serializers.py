from rest_framework import serializers
from django.db.models import Q, Sum, F
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone
from usuarios.models import *

class FamiliaSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Familia
        fields = ['id', 'nombre', 'apellido', 'dni', 'telefono', 'email', 'relacion']

class AlumnoSerializer(serializers.ModelSerializer):
    contacto_emergencia_telefono = serializers.CharField(max_length=53, trim_whitespace=False, required=False, allow_blank=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True, allow_null=True)
    username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    familias = FamiliaSimpleSerializer(many=True, read_only=True)

    class Meta:
        model = Alumno
        fields = [
            'id',
            'user_id',
            'username',
            'nombre',
            'apellido',
            'dni',
            'cuil',
            'fecha_nacimiento',
            'año',
            'division',
            'grupo',
            'calle',
            'numero_calle',
            'entre_calles',
            'tipo_vivienda',
            'piso',
            'letra_edificio',
            'letra_ph',
            'municipio',
            'telefonos_tutores',
            'email',
            'observaciones',
            'lugar_nacimiento',
            'nacionalidad',
            'localidad',
            'partido',
            'sexo',
            'identidad_genero',
            'fecha_creacion',
            'obra_social',
            'numero_afiliado',
            'grupo_sanguineo',
            'factor_rh',
            'alergias',
            'medicacion',
            'enfermedades_preexistentes',
            'contacto_emergencia_nombre',
            'contacto_emergencia_telefono',
            'observaciones_salud',
            'familias',
        ]
        read_only_fields = ['user', 'id', 'fecha_creacion', 'user_id', 'username']

    def create(self, validated_data):
        validated_data['user'] = None
        return super().create(validated_data)

    def validate_cuil(self, value):
        if value and Alumno.objects.filter(cuil=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError('Ya existe un alumno con este CUIL.')
        return value

    def to_representation(self, instance):
        from usuarios.access import HEALTH_FIELDS, can_read_health
        data = super().to_representation(instance)
        request = self.context.get('request')
        if not request or not can_read_health(request.user, instance):
            for field in HEALTH_FIELDS:
                data.pop(field, None)
        return data

    def validate_grupo(self, value):
        if value not in ('A', 'B', ''):
            raise serializers.ValidationError('Grupo debe ser A o B.')
        return value

    def validate(self, data):
        from usuarios.access import HEALTH_FIELDS, administrative
        request = self.context.get('request')
        if HEALTH_FIELDS.intersection(data) and (not request or not administrative(request.user)):
            raise serializers.ValidationError('No tiene permiso para modificar información sanitaria.')
        return data

    def validate_telefonos_tutores(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Debe ser una lista de teléfonos.')
        for phone in value:
            if not isinstance(phone, dict) or not isinstance(phone.get('numero'), str) or len(phone['numero']) > 53:
                raise serializers.ValidationError('Cada teléfono debe contener un número de hasta 53 caracteres.')
        return value

class AlumnoUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alumno
        fields = [
            'obra_social', 'numero_afiliado', 'grupo_sanguineo', 'factor_rh',
            'alergias', 'medicacion', 'enfermedades_preexistentes',
            'contacto_emergencia_nombre', 'contacto_emergencia_telefono',
            'observaciones_salud',
        ]

class CrearUsuarioAlumnoSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(min_length=8)
    alumno_id = serializers.IntegerField()

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('El nombre de usuario ya existe')
        return value

    def validate_alumno_id(self, value):
        if not Alumno.objects.filter(id=value).exists():
            raise serializers.ValidationError('El alumno no existe')
        if Alumno.objects.filter(id=value).exclude(user__isnull=True).exists():
            raise serializers.ValidationError('El alumno ya tiene un usuario asignado')
        return value

    def save(self):
        data = self.validated_data
        alumno = Alumno.objects.get(id=data['alumno_id'])
        user = User.objects.create_user(
            username=data['username'],
            password=data['password'],
            first_name=alumno.nombre,
            last_name=alumno.apellido
        )
        alumno.user = user
        alumno.save(update_fields=['user'])
        try:
            rol_estudiante = Rol.objects.get(nombre='estudiante')
            Perfil.objects.create(user=user, rol=rol_estudiante)
        except Rol.DoesNotExist:
            rol_estudiante, _ = Rol.objects.get_or_create(nombre='estudiante')
            Perfil.objects.create(user=user, rol=rol_estudiante)
        return alumno

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(value)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value

class DocenteSerializer(serializers.ModelSerializer):
    telefono = serializers.CharField(max_length=53, allow_blank=True, required=False, trim_whitespace=False)
    class Meta:
        model = Docente
        fields = '__all__'
        read_only_fields = ['user', 'id', 'fecha_creacion']

    def validate_cuil(self, value):
        if value and Docente.objects.filter(cuil=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError('Ya existe un docente con este CUIL.')
        return value

class PreceptorSerializer(serializers.ModelSerializer):
    telefono = serializers.CharField(max_length=53, allow_blank=True, required=False, trim_whitespace=False)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Preceptor
        fields = '__all__'
        read_only_fields = ['user', 'id', 'fecha_creacion', 'user_id', 'username']

    def create(self, validated_data):
        # A personal record is independent of account provisioning.
        return super().create(validated_data)

    def validate_cuil(self, value):
        if value and Preceptor.objects.filter(cuil=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError('Ya existe un preceptor con este CUIL.')
        return value

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        user = instance.user
        if user:
            user.first_name = validated_data.get('nombre', user.first_name)
            user.last_name = validated_data.get('apellido', user.last_name)
            user.save()
        
        return instance

class FamiliaSerializer(serializers.ModelSerializer):
    telefono = serializers.CharField(max_length=53, allow_blank=True, required=False, trim_whitespace=False)
    alumnos = AlumnoSerializer(many=True, read_only=True)
    alumno_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    def validate_cuil(self, value):
        if value and Familia.objects.filter(cuil=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError('Ya existe un familiar con este CUIL.')
        return value

    class Meta:
        model = Familia
        fields = '__all__'
        read_only_fields = ['user', 'id', 'fecha_creacion', 'alumnos']

    def create(self, validated_data):
        alumno_ids = validated_data.pop('alumno_ids', [])
        familia = Familia.objects.create(**validated_data)
        if alumno_ids:
            alumnos = Alumno.objects.filter(id__in=alumno_ids)
            familia.alumnos.add(*alumnos)
        return familia

    def update(self, instance, validated_data):
        alumno_ids = validated_data.pop('alumno_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if alumno_ids is not None:
            alumnos = Alumno.objects.filter(id__in=alumno_ids)
            instance.alumnos.set(alumnos)
        return instance

    def validate_alumno_ids(self, value):
        from usuarios.access import visible_students
        if set(value) - set(visible_students(self.context['request'].user).filter(pk__in=value).values_list('pk', flat=True)):
            raise serializers.ValidationError('Alumno inexistente o no autorizado.')
        return value

class CrearUsuarioFamiliaSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(min_length=8)
    familia_id = serializers.IntegerField()

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('El nombre de usuario ya existe')
        return value

    def validate_familia_id(self, value):
        if not Familia.objects.filter(id=value).exists():
            raise serializers.ValidationError('La familia no existe')
        if Familia.objects.filter(id=value).exclude(user__isnull=True).exists():
            raise serializers.ValidationError('La familia ya tiene un usuario asignado')
        return value

    def save(self):
        data = self.validated_data
        familia = Familia.objects.get(id=data['familia_id'])
        user = User.objects.create_user(
            username=data['username'],
            password=data['password'],
            first_name=familia.nombre,
            last_name=familia.apellido
        )
        familia.user = user
        familia.save(update_fields=['user'])
        try:
            rol_familia = Rol.objects.get(nombre='familia')
            Perfil.objects.create(user=user, rol=rol_familia)
        except Rol.DoesNotExist:
            rol_familia, _ = Rol.objects.get_or_create(nombre='familia')
            Perfil.objects.create(user=user, rol=rol_familia)
        return familia

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(value)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value

class CrearUsuarioDocenteSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(min_length=8)
    docente_id = serializers.IntegerField()

    def validate_docente_id(self, value):
        if not Docente.objects.filter(id=value).exists():
            raise serializers.ValidationError('El docente no existe')
        return value

    def validate_username(self, value):
        docente = Docente.objects.get(id=self.initial_data.get('docente_id'))
        if docente.user:
            if User.objects.filter(username=value).exclude(id=docente.user.id).exists():
                raise serializers.ValidationError('El nombre de usuario ya existe')
        else:
            if User.objects.filter(username=value).exists():
                raise serializers.ValidationError('El nombre de usuario ya existe')
        return value

    def save(self):
        data = self.validated_data
        docente = Docente.objects.get(id=data['docente_id'])
        if docente.user:
            user = docente.user
            user.username = data['username']
            user.set_password(data['password'])
            user.first_name = docente.nombre
            user.last_name = docente.apellido
            user.save()
            Perfil.objects.get_or_create(user=user, defaults={'rol': Rol.objects.get_or_create(nombre='profesor')[0]})
        else:
            user = User.objects.create_user(
                username=data['username'],
                password=data['password'],
                first_name=docente.nombre,
                last_name=docente.apellido
            )
            docente.user = user
            docente.save(update_fields=['user'])
            try:
                rol_profesor = Rol.objects.get(nombre='profesor')
                Perfil.objects.create(user=user, rol=rol_profesor)
            except Rol.DoesNotExist:
                rol_profesor, _ = Rol.objects.get_or_create(nombre='profesor')
                Perfil.objects.create(user=user, rol=rol_profesor)
        return docente

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(value)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value

class CrearUsuarioPreceptorSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(min_length=8)
    preceptor_id = serializers.IntegerField()

    def validate_preceptor_id(self, value):
        if not Preceptor.objects.filter(id=value).exists():
            raise serializers.ValidationError('El preceptor no existe')
        return value

    def validate_username(self, value):
        preceptor = Preceptor.objects.get(id=self.initial_data.get('preceptor_id'))
        if preceptor.user:
            if User.objects.filter(username=value).exclude(id=preceptor.user.id).exists():
                raise serializers.ValidationError('El nombre de usuario ya existe')
        else:
            if User.objects.filter(username=value).exists():
                raise serializers.ValidationError('El nombre de usuario ya existe')
        return value

    def save(self):
        data = self.validated_data
        preceptor = Preceptor.objects.get(id=data['preceptor_id'])
        if preceptor.user:
            user = preceptor.user
            user.username = data['username']
            user.set_password(data['password'])
            user.first_name = preceptor.nombre
            user.last_name = preceptor.apellido
            user.save()
            Perfil.objects.get_or_create(user=user, defaults={'rol': Rol.objects.get_or_create(nombre='preceptor')[0]})
        else:
            user = User.objects.create_user(
                username=data['username'],
                password=data['password'],
                first_name=preceptor.nombre,
                last_name=preceptor.apellido
            )
            preceptor.user = user
            preceptor.save(update_fields=['user'])
            try:
                rol_preceptor = Rol.objects.get(nombre='preceptor')
                Perfil.objects.create(user=user, rol=rol_preceptor)
            except Rol.DoesNotExist:
                rol_preceptor, _ = Rol.objects.get_or_create(nombre='preceptor')
                Perfil.objects.create(user=user, rol=rol_preceptor)
        return preceptor

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(value)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value

class PersonalStaffSerializer(serializers.ModelSerializer):
    telefono = serializers.CharField(max_length=53, allow_blank=True, required=False, trim_whitespace=False)
    class Meta:
        model = PersonalStaff
        fields = '__all__'
        read_only_fields = ['user', 'id', 'fecha_creacion']

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        user = instance.user
        if user:
            user.first_name = validated_data.get('nombre', user.first_name)
            user.last_name = validated_data.get('apellido', user.last_name)
            user.save()
            
        return instance

class CrearUsuarioPersonalStaffSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(min_length=8)
    personal_staff_id = serializers.IntegerField()
    rol = serializers.CharField()

    def validate_personal_staff_id(self, value):
        if not PersonalStaff.objects.filter(id=value).exists():
            raise serializers.ValidationError('El registro de personal no existe')
        return value

    def validate_username(self, value):
        staff = PersonalStaff.objects.get(id=self.initial_data.get('personal_staff_id'))
        if staff.user:
            if User.objects.filter(username=value).exclude(id=staff.user.id).exists():
                raise serializers.ValidationError('El nombre de usuario ya existe')
        else:
            if User.objects.filter(username=value).exists():
                raise serializers.ValidationError('El nombre de usuario ya existe')
        return value

    def save(self):
        data = self.validated_data
        staff = PersonalStaff.objects.get(id=data['personal_staff_id'])
        if staff.user:
            user = staff.user
            user.username = data['username']
            user.set_password(data['password'])
            user.first_name = staff.nombre
            user.last_name = staff.apellido
            user.save()
        else:
            user = User.objects.create_user(
                username=data['username'],
                password=data['password'],
                first_name=staff.nombre,
                last_name=staff.apellido
            )
            staff.user = user
            staff.save(update_fields=['user'])
        rol, _ = Rol.objects.get_or_create(nombre=data['rol'])
        Perfil.objects.get_or_create(user=user, defaults={'rol': rol})
        return staff

    def validate_rol(self, value):
        from usuarios.account_policy import validate_assigned_role
        return validate_assigned_role(self.context['request'].user, value)

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(value)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value

