from django.contrib import admin
from .models import Rol, Perfil, Evento, PersonalStaff


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre')


@admin.register(Perfil)
class PerfilAdmin(admin.ModelAdmin):
    list_display = ('user', 'rol', 'get_roles_extra')
    list_filter = ('rol',)
    filter_horizontal = ('roles',)

    def get_roles_extra(self, obj):
        return ', '.join(obj.get_all_roles())
    get_roles_extra.short_description = 'Todos los roles'


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'fecha', 'hora_inicio', 'lugar', 'tipo', 'creado_por')
    list_filter = ('tipo', 'fecha', 'lugar')
    search_fields = ('titulo', 'descripcion', 'lugar')


@admin.register(PersonalStaff)
class PersonalStaffAdmin(admin.ModelAdmin):
    list_display = ('apellido', 'nombre', 'dni', 'telefono', 'email')
    search_fields = ('apellido', 'nombre', 'dni')
