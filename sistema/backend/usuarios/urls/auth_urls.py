from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from usuarios.views import (
    LoginView, 
    PerfilView, 
    CambiarContrasenaView, 
    CrearUsuarioSimpleView, 
    DesactivarCuentaView, 
    ActivarCuentaView
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('perfil/', PerfilView.as_view(), name='perfil'),
    path('cambiar-contrasena/', CambiarContrasenaView.as_view(), name='cambiar-contrasena'),
    path('usuarios/crear/', CrearUsuarioSimpleView.as_view(), name='usuario-crear'),
    path('notificaciones/desactivar-cuenta/', DesactivarCuentaView.as_view(), name='desactivar-cuenta'),
    path('notificaciones/activar-cuenta/', ActivarCuentaView.as_view(), name='activar-cuenta'),
]
