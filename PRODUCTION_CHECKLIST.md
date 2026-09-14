# Criterios de aceptación

Estado actual: **NO APTO para exposición pública ni carga de datos reales**. Una compilación exitosa o pruebas con SQLite no certifican producción. Marcar casillas únicamente con evidencia fechada.

- [ ] Revisión funcional completa de todos los roles y rutas del informe 0–55.
- [ ] `npm ci`, build, contratos frontend y lint sin errores ni advertencias pendientes.
- [ ] Permisos por objeto, escalamiento, escritura, filtros y persistencia verificados.
- [ ] Crear/editar/eliminar personas, cursos, eventos, comunicados, biblioteca y asistencia desde interfaz; refrescar y volver a iniciar sesión.
- [ ] Chat directo/grupo de tres o más usuarios, historial mayor a 200, reconexión, dos pestañas, lectura persistida y aislamiento de conversaciones.
- [ ] Pantallas 1920, 1366, 1024, 768 y móvil sin contenido inaccesible.
- [x] Python 3.13.15 y migración completa en PostgreSQL 17.11 vacío, sin Supabase, validados localmente el 14/09/2026. Repetir en el servidor.
- [ ] `manage.py check_native`: Redis 8 real y entrega por canales; verificar también dos procesos Daphne.
- [ ] `check`, `makemigrations --check --dry-run`, `showmigrations` y `check --deploy` del entorno objetivo.
- [ ] `nginx -t`, validación systemd, reinicio del servidor y recuperación del servicio.
- [ ] Staging restringido por interfaz, firewall y ACL; servicios internos en loopback.
- [ ] Dominio, TLS válido, redirección HTTPS, proxy y renovación de certificado probados.
- [ ] Contraseñas/secretos nuevos; revisión de historial y credenciales previamente expuestas.
- [ ] SMTP y, si se usa, push del navegador con claves correctas y preferencias probadas.
- [ ] Backups cifrados, retención y restauración probada en base independiente.
- [ ] Responsable de operación, monitoreo, recuperación e incidentes designado.

Staging sólo será APTO cuando sus pruebas funcionales y de infraestructura estén completas. Producción agrega TLS, secretos, recuperación y validación sobre el servidor real. No convertir casillas pendientes en aprobadas por inferencia.
