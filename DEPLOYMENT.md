# Instalación nativa y puesta en marcha

Objetivo solicitado: Huawei RH1288 V3, Debian 13, Python 3.13, PostgreSQL 17, Redis 8, Nginx, Daphne y systemd. Ruta `/srv/sistema-escolar`. Estas instrucciones preparan una instalación nueva; no importan datos ni copias de Supabase. La certificación en ese servidor está pendiente.

El navegador abre una URL de Nginx. Nginx sirve `frontend/dist` y deriva `/api/` y `/ws/` a Daphne en `127.0.0.1:8000`. systemd inicia y reinicia Daphne. No se ejecuta Vite al abrir la aplicación.

## Preparación

1. Verificar las versiones solicitadas en Debian y la disponibilidad de `python3.13-venv`, PostgreSQL, Redis, Nginx, Node y npm. Instalar desde repositorios oficiales. Crear un usuario de servicio `sistema-app` sin acceso interactivo.
2. Copiar solamente código revisado a `/srv/sistema-escolar`; excluir `.env`, bases, SQL, dumps, `venv`, `node_modules`, logs y datos de auditoría. El usuario de servicio necesita lectura del código y escritura solamente en `backend/media`. Dar a Nginx lectura de `frontend/dist` y `backend/backend/staticfiles`.
3. Crear una base PostgreSQL **vacía**, por ejemplo `sistema_escolar_staging`, y un rol dedicado `sistema_app` con contraseña propia. No usar el superusuario `postgres` como usuario de aplicación. Mantener PostgreSQL y Redis en loopback; revisar los fragmentos de configuración de `deploy/` y las reglas de acceso existentes.
4. Crear `/etc/sistema-escolar/app.env` a partir de `.env.example`, propiedad de root y modo `0600`. Completar todos los valores `CHANGE_`, hosts y orígenes reales. Generar el secreto con `python3.13 -c 'import secrets; print(secrets.token_urlsafe(64))'`. No copiar ese secreto a mensajes, tickets ni Git. El archivo se interpreta como `EnvironmentFile` de systemd; Django no carga `.env` por sí solo.

### Preflight Check (ejecutar antes de deployment)

```sh
sudo /srv/sistema-escolar/deploy/scripts/preflight.sh
```

Debe salir con código 0.

En una sesión de mantenimiento autorizada sobre el código:

```sh
cd /srv/sistema-escolar
python3.13 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
.venv/bin/python -m pip check
cd frontend
npm ci
npm run lint
node --test tests/contracts.test.js
npm run build
```

Ejecutar Django con las variables de `/etc/sistema-escolar/app.env` cargadas por el operador, desde `backend/`, usando `../.venv/bin/python`. Para comprobaciones no interactivas se puede usar una unidad transitoria:

```sh
sudo systemd-run --wait --pipe --collect --uid=sistema-app \
  --property=EnvironmentFile=/etc/sistema-escolar/app.env \
  --property=WorkingDirectory=/srv/sistema-escolar/backend \
  /srv/sistema-escolar/.venv/bin/python manage.py check
```

Repetir el mismo prefijo para `makemigrations --check --dry-run`, `migrate --plan`, `migrate`, `collectstatic --noinput` y `check_native`. No ejecutar `makemigrations` para generar migraciones en el servidor. Para crear la primera cuenta, usar `createsuperuser` en una sesión interactiva con el entorno correcto y después `ensure_admin_profile NOMBRE`. No existe contraseña inicial compartida.

## Staging privado

Configurar `DJANGO_ENV=staging`. Completar `PRIVATE_BIND_IP` y `LAN_CIDR` en `deploy/nginx/sistema-staging.conf`. Añadir el host/IP correspondiente a `ALLOWED_HOSTS` y a los orígenes CSRF. Copiar el fragmento común a `/etc/nginx/snippets/sistema-common.conf` y el sitio a `sites-available`; habilitarlo siguiendo la configuración local de Nginx. El firewall y las ACL de Tailscale deben permitir exclusivamente los dispositivos de prueba. No abrir puertos del router hacia este sitio.

Instalar `deploy/systemd/sistema-escolar.service` en `/etc/systemd/system/`. Crear previamente el directorio `backend/media`. Después:

```sh
sudo nginx -t
sudo systemd-analyze verify /etc/systemd/system/sistema-escolar.service
sudo systemctl daemon-reload
sudo systemctl enable --now sistema-escolar
sudo systemctl reload nginx
sudo systemctl status sistema-escolar --no-pager
```

### Post-Deploy Smoke Tests

```sh
BASE_URL=http://srv-app01 /srv/sistema-escolar/deploy/scripts/smoke-test.sh
```

Debe salir con código 0.

Verificar arranque tras reinicio, login desde otro equipo autorizado, API, chat, notificaciones y errores del journal. Comprobar que 5432, 6379 y 8000 no escuchan en interfaces públicas. HTTP privado exige aislamiento; no autoriza datos reales ni exposición pública.

## Producción

Requiere completar la lista de `PRODUCTION_CHECKLIST.md`, DNS, certificado válido y SMTP. Configurar `DJANGO_ENV=production`, orígenes HTTPS y la plantilla `sistema-production.conf`. Ejecutar `manage.py check --deploy` contra ese entorno; no silenciar avisos para obtener un resultado favorable. VAPID es opcional: configurar ambas claves para notificaciones del navegador; las notificaciones internas siguen usando base de datos y WebSocket. Verificar compatibilidad de la clave pública del cliente antes de habilitar push.

Las plantillas contienen marcadores intencionales: no están listas para activarse sin adaptación al servidor. No se ha probado `nginx -t` ni systemd en esta estación Windows.

## Operación, copias y recuperación

### Backup diario (cron para sistema-app)

```sh
0 2 * * * /srv/sistema-escolar/deploy/scripts/backup.sh >> /var/log/sistema-escolar-backup.log 2>&1
```

### Test de restauración (ejecutar semanalmente)

```sh
sudo -u postgres /srv/sistema-escolar/deploy/scripts/restore-test.sh
```

Programar `pg_dump --format=custom` de la nueva base y copia separada del directorio de archivos, con permisos restringidos, cifrado y retención definida por la escuela. Guardar las credenciales fuera de la copia de código. Probar restauración en **otra base vacía**, registrar duración y comprobar conteos y flujos; no ensayar restauraciones sobre la base activa. Mantener una versión del código compatible con cada copia. Ante una actualización fallida, detener el servicio, evaluar compatibilidad de migraciones y restaurar código/base compatibles; no ejecutar migraciones inversas a ciegas.

Referencias: [despliegue de Django](https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/), [Channels y supervisión de Daphne](https://channels.readthedocs.io/en/stable/deploying.html), [proxy WebSocket de Nginx](https://nginx.org/en/docs/http/websocket.html).
