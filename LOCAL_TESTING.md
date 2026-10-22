# Testing local — EESTN1 en Windows

Este procedimiento usa una base PostgreSQL alojada, Daphne y Vite. No importa datos ni credenciales de bases previas. No despliega en Huawei. Redis es opcional en development: el canal en memoria permite probar WebSockets en un proceso, sin acreditar Redis ni múltiples procesos.

## 1. Base de datos — POSTGRESQL ALOJADO

La base de desarrollo es un proyecto PostgreSQL alojado en Supabase, región `us-east-1`. La conexión directa `db.<ref>.supabase.co` publica únicamente IPv6; en equipos sin IPv6 se usa el pooler IPv4 en `aws-0-us-east-1.pooler.supabase.com:5432` con el usuario `postgres.<ref>`.

No se instala ni se inicializa ningún servidor PostgreSQL local. Solo se necesita el cliente `psql` para comprobar la conexión:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' --version
$env:PGPASSWORD='CHANGE_DB_PASSWORD'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h aws-0-us-east-1.pooler.supabase.com -p 5432 -U postgres.CHANGE_PROJECT_REF -d postgres -c "select current_database(), version();"
```

El puerto 5432 usa modo sesión. El puerto 6543 usa modo transacción y no admite sentencias preparadas persistentes; para Django y `migrate` usar 5432. La conexión exige SSL: `sslmode=require`.

No crear roles ni bases adicionales: se trabaja sobre la base `postgres` del proyecto. No inicializar un cluster local en el mismo puerto para evitar confundir conexiones.

## 2. Configuración — BACKEND / POWERSHELL

```powershell
Set-Location C:\Users\Usuario\Desktop\sistema\sistemas_candidatos\backend
Copy-Item .env.example .env
```

Ejecutar la copia solamente si `.env` no existe. Editar `backend/.env` con estos nombres exactos:

```dotenv
DJANGO_ENV=development
DB_ENGINE=django.db.backends.postgresql
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.CHANGE_PROJECT_REF
DB_PASSWORD=CHANGE_DB_PASSWORD
DB_SSLMODE=require
DJANGO_SECRET_KEY=CHANGE_LOCAL_RANDOM_SECRET
```

Reemplazar todos los CHANGE_*; nunca dejarlos como credenciales. Puede generarse una clave local con `python -c "import secrets; print(secrets.token_urlsafe(48))"`. El archivo real está ignorado por Git; el ejemplo no contiene secretos. Development carga exclusivamente `backend/.env` con dotenv y no pisa variables exportadas en el proceso. Staging/production importan sus settings y reciben variables del entorno/systemd; no cargan dotenv. Sin contraseña, clave o DB_HOST declarados, development falla con un mensaje explícito. DEBUG está activado por el entorno development, no se necesita una variable DEBUG.

Si PowerShell heredó un entorno diferente, para esta terminal local:

```powershell
$env:DJANGO_ENV='development'
```

## 3. Dependencias — BACKEND / POWERSHELL

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

No borrar, modificar ni squashear migraciones para inicializar una base vacía. Deben aplicarse 0001–0042. No usar scripts históricos `reset_seed.py`, dumps ni restauraciones. La validación final de la cadena de migraciones se ejecutó con Python 3.13.15 y PostgreSQL 17.11 en Windows; los resultados están en LOCAL-VALIDATION-REPORT.md.

Para una cuenta administrativa propia (opcional al probar con seed):

```powershell
& .\.venv\Scripts\python.exe manage.py createsuperuser
& .\.venv\Scripts\python.exe manage.py ensure_admin_profile NOMBRE_DE_SUPERUSUARIO
```

Consultar `manage.py ensure_admin_profile --help` para su argumento exacto. Los datos sintéticos incluyen una cuenta con rol admin de la app; no es superusuario Django.

## 4. Datos sintéticos — BACKEND

```powershell
& .\.venv\Scripts\python.exe manage.py seed_test_data
& .\.venv\Scripts\python.exe manage.py seed_test_data
```

DEVELOPMENT ONLY — DO NOT USE IN STAGING/PRODUCTION.

`seed_test_data` exige development y una base cuyo nombre termine en `_local`, o `settings_test` explícito para las pruebas unitarias. La base alojada se llama `postgres`, por lo que el comando la rechaza: es una protección para no escribir datos ficticios en la base del proyecto. Para pruebas funcionales con datos ficticios usar `--settings=backend.settings_test`.

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

Los emails terminan en `.example.invalid`. Es transaccional; rechaza colisiones de usuarios fuera del namespace ficticio. Crea 19 cuentas, 4 alumnos, cursos 1°A/2°B/7°A, grupos A/B, materias/asignaciones, familia, horarios, notas, tres estados de asistencia, un comunicado, evento, libro, préstamo pendiente, notificaciones, chat individual y grupo de cuatro con 205 mensajes. Muestra CREATED y EXISTING. No se ejecuta automáticamente.

## 5. Levantar la aplicación — dos terminales

BACKEND:

```powershell
& .\.venv\Scripts\python.exe -m daphne -b 127.0.0.1 -p 8000 backend.asgi:application
```

FRONTEND (Node ^20.19.0 o >=22.12.0; validado con 24.15.0):

```powershell
Set-Location C:\Users\Usuario\Desktop\sistema\sistemas_candidatos\frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173`. Vite redirige `/api` a `http://127.0.0.1:8000` y `/ws` a `ws://127.0.0.1:8000` con `ws:true`; el código React conserva `/api` y `/ws`. Usar un solo proceso Daphne cuando Channels funciona en memoria. No abrir puertos en el firewall ni exponer esta instancia.

Detener Vite antes de repetir npm ci en Windows: los módulos nativos en uso pueden provocar EPERM. No ejecutar npm como administrador para resolver ese bloqueo.

## 6. Pruebas — BACKEND

```powershell
& .\.venv\Scripts\python.exe manage.py test usuarios.test_hardening usuarios.test_websockets usuarios.test_seed usuarios.test_local_validation -v 2 --noinput
```

Con development y la base alojada, Django crea una base de test separada y no vacía la base del proyecto. Para SQLite aislado se debe elegir expresamente `--settings=backend.settings_test`; ese resultado no certifica PostgreSQL. Los WebSocket tests usan Channels en memoria en development. Redis 8 y entrega entre procesos quedan para infraestructura compatible/Huawei.

## 7. Pruebas — FRONTEND

```powershell
npm run lint
npm run test
npm run build
npx playwright install chromium
$env:BASE_URL='http://127.0.0.1:5173'
npm run test:e2e
```

Backend y datos de prueba deben estar listos antes del E2E. Playwright inicia/reutiliza Vite en 5173; no utiliza `vite preview` sin proxy. Los tests emplean cuentas distintas por rol y verifican DOM/operaciones, ya que la app navega por estado y no tiene rutas `/inicio` o `/mis-cursos`. Resultados y capturas quedan en `test-results/` y `playwright-report/`, ignorados por Git. Para ejecución visible: `npm run test:e2e:headed`.

## 8. Restablecimiento — SOLO BASE DESCARTABLE

No se agregó reset_test_data: las relaciones y los registros creados manualmente sobre el seed impiden garantizar un borrado selectivo sin pérdida accidental. Para reiniciar la base alojada, recrearla desde el panel del proveedor cuando el contenido sea descartable, y volver a ejecutar migrate.

```sql
-- Conectado a postgres, nunca a una base escolar real:
SELECT datname FROM pg_database WHERE datname = 'postgres';
-- Tras verificar manualmente que no contiene datos a conservar:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

No usar FORCE ni flush automático. Estos comandos son instrucciones manuales y no se ejecutaron sobre datos existentes durante la validación.
