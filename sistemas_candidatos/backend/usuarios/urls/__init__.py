from django.urls import path, include

urlpatterns = [
    path('', include('usuarios.urls.auth_urls')),
    path('', include('usuarios.urls.api_urls')),
]
