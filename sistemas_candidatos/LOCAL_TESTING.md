# Testing local — EESTN1 en Windows

Este procedimiento usa PostgreSQL 17 vacío, Daphne y Vite. No importa datos ni credenciales de Supabase. No despliega en Huawei. Redis es opcional en development: el canal en memoria permite probar WebSockets en un proceso, sin acreditar Redis ni múltiples procesos.

## 1. PostgreSQL — POWERSHELL / instalador

Descargar PostgreSQL 17 para Windows desde [PostgreSQL](https://www.postgresql.org/download/windows/) y el proveedor enlazado EDB. Elegir servidor y herramientas de línea de comandos, puerto 5432 y una contraseña local propia. No usar credenciales históricas. Agregar `C:\Program Files\PostgreSQL\17\bin` al PATH o invocar sus ejecutables por ruta absoluta.

```powershell
Get-Service -Name '*postgres*'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' --version
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h 127.0.0.1 -U postgres -d postgres
```

Durante esta validación se usaron los binarios oficiales 17.11 en una instancia aislada, no un servicio Windows global. Está en `C:\Users\Usuario\Documents\Codex\2026-09-10\h\work\postgresql17`; su cluster está en la carpeta hermana `postgresql17-data`. El informe registra si quedó en ejecución. No inicializar otro cluster en el mismo puerto.

## 2. Crear propietario y base — POSTGRESQL/PSQL

En psql, conectado como administrador local:

```sql
CREATE ROLE sistema_app_local LOGIN;
\password sistema_app_local
CREATE DATABASE sistema_escolar_local OWNER sistema_app_local;
ALTER ROLE sistema_app_local CREATEDB;
\connect sistema_escolar_local
SELECT current_database(), version();
\quit
```

`\password` solicita la contraseña sin escribirla en el SQL. CREATEDB permite al runner Django crear y eliminar `test_sistema_escolar_local`; es un permiso exclusivamente local. No concederlo al usuario de producción. La base pertenece al usuario de aplicación, incluido el esquema public mediante el rol de propietario de la base en PostgreSQL 17. No hace falta conceder privilegios globales a PUBLIC.

## 3. Configuración — BACKEND / POWERSHELL

```powershell
Set-Location C:\Users\Usuario\Desktop\sistema\backend
Copy-Item .env.example .env
```

Ejecutar la copia solamente si `.env` no existe. Editar `backend/.env` con estos nombres exactos:

```dotenv
DJANGO_ENV=development
DB_ENGINE=django.db.backends.postgresql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=sistema_escolar_local
DB_USER=sistema_app_local
DB_PASSWORD=CHANGE_LOCAL_PASSWORD
DJANGO_SECRET_KEY=CHANGE_LOCAL_RANDOM_SECRET
```

Reemplazar ambos CHANGE_*; nunca dejarlos como credenciales. Puede generarse una clave local con `python -c "import secrets; print(secrets.token_urlsafe(48))"`. El archivo real está ignorado por Git; el ejemplo no contiene secretos. La sesión de validación ya creó un `.env` local con valores aleatorios: conservarlo. Development carga exclusivamente `backend/.env` con dotenv y no pisa variables exportadas en el proceso. Staging/production importan sus settings y reciben variables del entorno/systemd; no cargan dotenv. Sin contraseña/clave, development falla con un mensaje explícito; rechaza DB_HOST remoto y otro DB_ENGINE. DEBUG está activado por el entorno development, no se necesita una variable DEBUG.

Si PowerShell heredó un entorno diferente, para esta terminal local:

```powershell
$env:DJANGO_ENV='development'
```

## 4. Dependencias — BACKEND / POWERSHELL

```powershell
py -3.13 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.venv\Scripts\python.exe -m pip check
& .\.venv\Scripts\python.exe manage.py check
& .\.venv\Scripts\python.exe manage.py migrate --plan
& .\.venv\Scripts\python.exe manage.py migrate
& .\.venv\Scripts\python.exe manage.py showmigrations
& .\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

No borrar, modificar ni squashear migraciones para inicializar una base vacía. Deben aplicarse 0001–0042. No usar scripts históricos `reset_seed.py`, dumps ni restauraciones. La validación final se ejecutó con Python 3.13.15 y PostgreSQL 17.11 reales en Windows. También hubo una ejecución previa con Python 3.12.14; los resultados finales están en LOCAL-VALIDATION-REPORT.md.

Para una cuenta administrativa propia (opcional al probar con seed):

```powershell
& .\.venv\Scripts\python.exe manage.py createsuperuser
& .\.venv\Scripts\python.exe manage.py ensure_admin_profile NOMBRE_DE_SUPERUSUARIO
```

Consultar `manage.py ensure_admin_profile --help` para su argumento exacto. Los datos sintéticos incluyen una cuenta con rol admin de la app; no es superusuario Django.

## 5. Datos sintéticos — BACKEND

```powershell
& .\.venv\Scripts\python.exe manage.py seed_test_data
& .\.venv\Scripts\python.exe manage.py seed_test_data
```

DEVELOPMENT ONLY — DO NOT USE IN STAGING/PRODUCTION.

Contraseña pública de prueba para todas las cuentas nuevas: `Synthetic!Password-4921`. Puede cambiarse antes de la primera carga mediante TEST_DATA_PASSWORD; los E2E deberán recibir el mismo valor en TEST_PASS. Repetir el seed no cambia contraseñas ni datos editados.

| Usuario | Rol |
|---|---|
| test_admin | Admin |
| test_director / test_vicedirector | Dirección / Vicedirección |
| test_secretario | Secretaría |
| test_preceptor / test_jefe_preceptores | Preceptoría / Jefatura |
| test_profesor / test_profesor2 | Profesor |
| test_jefe_area / test_jefe_departamento | Jefaturas docentes |
| test_familia | Familia vinculada a dos estudiantes |
| test_estudiante / test_estudiante2 / test_estudiante3 / test_estudiante4 | Estudiantes |
| test_bibliotecario | Biblioteca |
| test_eoe | EOE |
| test_ematp | EMATP |
| test_auxiliar | Auxiliar |

Los emails terminan en `.example.invalid`. El comando exige development y una DB cuyo nombre termine en `_local`, o settings_test explícito para las pruebas unitarias. Staging y production están bloqueados. Es transaccional; rechaza colisiones de usuarios fuera del namespace ficticio. Crea 19 cuentas, 4 alumnos, cursos 1°A/2°B/7°A, grupos A/B, materias/asignaciones, familia, horarios, notas, tres estados de asistencia, un comunicado, evento, libro, préstamo pendiente, notificaciones, chat individual y grupo de cuatro con 205 mensajes. Muestra CREATED y EXISTING. No se ejecuta automáticamente.

## 6. Levantar la aplicación — dos terminales

BACKEND:

```powershell
& .\.venv\Scripts\python.exe -m daphne -b 127.0.0.1 -p 8000 backend.asgi:application
```

FRONTEND (Node ^20.19.0 o >=22.12.0; validado con 24.15.0):

```powershell
Set-Location C:\Users\Usuario\Desktop\sistema\frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173`. Vite redirige `/api` a `http://127.0.0.1:8000` y `/ws` a `ws://127.0.0.1:8000` con `ws:true`; el código React conserva `/api` y `/ws`. Usar un solo proceso Daphne cuando Channels funciona en memoria. No abrir puertos en el firewall ni exponer esta instancia.

Detener Vite antes de repetir npm ci en Windows: los módulos nativos en uso pueden provocar EPERM. No ejecutar npm como administrador para resolver ese bloqueo.

## 7. Pruebas — BACKEND

```powershell
& .\.venv\Scripts\python.exe manage.py test usuarios.test_hardening usuarios.test_websockets usuarios.test_seed usuarios.test_local_validation -v 2 --noinput
```

Este comando, con development, utiliza PostgreSQL y crea una base de test separada; no vacía la base sintética manual. Para SQLite aislado se debe elegir expresamente `--settings=backend.settings_test`; ese resultado no certifica PostgreSQL. Los WebSocket tests usan Channels en memoria en development. Redis 8 y entrega entre procesos quedan para infraestructura compatible/Huawei.

## 8. Pruebas — FRONTEND

```powershell
npm run lint
npm run test
npm run build
npx playwright install chromium
$env:BASE_URL='http://127.0.0.1:5173'
npm run test:e2e
```

Backend y seed deben estar listos antes del E2E. Playwright inicia/reutiliza Vite en 5173; no utiliza `vite preview` sin proxy. Los tests emplean cuentas distintas por rol y verifican DOM/operaciones, ya que la app navega por estado y no tiene rutas `/inicio` o `/mis-cursos`. Resultados y capturas quedan en `test-results/` y `playwright-report/`, ignorados por Git. Para ejecución visible: `npm run test:e2e:headed`.

## 9. Restablecimiento manual — SOLO DB local descartable

No se agregó reset_test_data: las relaciones y los registros creados manualmente sobre el seed impiden garantizar un borrado selectivo sin pérdida accidental. Para reiniciar, detener backend y tests y comprobar nombre y conexiones en psql. Solo si la DB local completa es descartable:

```sql
-- Conectado a postgres, nunca a una base escolar real:
SELECT datname FROM pg_database WHERE datname = 'sistema_escolar_local';
-- Tras verificar manualmente el nombre y que no contiene datos a conservar:
DROP DATABASE sistema_escolar_local;
CREATE DATABASE sistema_escolar_local OWNER sistema_app_local;
```

Volver a ejecutar migrate y seed. No usar FORCE ni flush automático. Estos comandos son instrucciones manuales y no se ejecutaron sobre datos existentes durante la validación.

## 10. Reutilizar la instalación portátil de esta sesión

PostgreSQL quedó iniciado en loopback. Después de reiniciar Windows, consultar su estado y arrancarlo sólo si está detenido:

```powershell
& 'C:\Users\Usuario\Documents\Codex\2026-09-10\h\work\postgresql17\pgsql\bin\pg_ctl.exe' status -D 'C:\Users\Usuario\Documents\Codex\2026-09-10\h\work\postgresql17-data'
& 'C:\Users\Usuario\Documents\Codex\2026-09-10\h\work\postgresql17\pgsql\bin\pg_ctl.exe' start -D 'C:\Users\Usuario\Documents\Codex\2026-09-10\h\work\postgresql17-data' -l 'C:\Users\Usuario\Documents\Codex\2026-09-10\h\work\postgresql17.log'
```

No requiere conocer la contraseña de PostgreSQL para arrancar ese cluster con el mismo usuario Windows. La aplicación usa su `.env` existente. Para iniciar Daphne con el entorno ya validado:

```powershell
Set-Location C:\Users\Usuario\Desktop\sistema\backend
& 'C:\Users\Usuario\Documents\Codex\2026-09-10\h\work\validation313\Scripts\python.exe' -m daphne -b 127.0.0.1 -p 8000 backend.asgi:application
```

En otra terminal iniciar Vite según la sección 6. Estos procesos se detuvieron al finalizar las pruebas. No repetir initdb ni recrear la base para simplemente volver a abrir la app.
