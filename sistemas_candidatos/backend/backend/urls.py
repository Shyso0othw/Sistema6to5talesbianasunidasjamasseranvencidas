import os
from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import FileResponse, HttpResponseNotFound

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('usuarios.urls')),
]

# Sirve index.html para las rutas del frontend SPA
def index_view(request):
    dist = Path(__file__).resolve().parent.parent.parent / 'frontend' / 'dist'
    index_path = dist / 'index.html'
    if index_path.exists():
        return FileResponse(open(index_path, 'rb'), content_type='text/html')
    return HttpResponseNotFound(
        'Frontend no compilado. Ejecutá: cd frontend && npm run build'
    )

urlpatterns += [
    re_path(r'^(?!api/|ws/|admin/|static/|sw\.js$).*', index_view, name='frontend'),
]
