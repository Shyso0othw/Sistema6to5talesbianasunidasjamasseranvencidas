# Validación local — EESTN1

Fecha: 14/09/2026. Código: `C:\Users\Usuario\Desktop\sistema`. Informe complementario: `AUDITORIA-FINAL-2026-09-14.md`.

## VEREDICTO

**POSTGRESQL LOCAL: PASS. BACKEND: PASS. E2E: PASS. FUNCTIONAL TESTING: PARCIAL.**

**READY TO FREEZE STAGING CANDIDATE: NO**, si se aplica el criterio solicitado de aceptación funcional completa de todos los roles y operaciones. Los circuitos enumerados abajo funcionan con PostgreSQL real; no se completó toda la matriz manual de altas, modificaciones, bajas, ventanas simultáneas y resoluciones para cada rol. La ausencia de fallos en 25 E2E no sustituye esa matriz. No hay un fallo abierto en las pruebas ejecutadas.

El código queda como candidato de trabajo para completar aceptación, sin commit automático. No está certificado para instalarse con datos reales ni para exposición pública. Huawei no fue conectado ni modificado.

## POSTGRESQL

- Windows; binarios oficiales PostgreSQL **17.11**, cluster nuevo UTF-8 en `work/postgresql17-data`, fuera del repositorio.
- Escucha: `127.0.0.1:5432`. Base: `sistema_escolar_local`. Propietario: `sistema_app_local`; CREATEDB exclusivamente para crear la base separada del runner de tests.
- Python **3.13.15**, venv limpio; requirements instalados y `pip check` aprobado. También existió una ejecución previa con Python 3.12; los resultados finales siguientes son de 3.13.
- `migrate --plan`, `migrate`, `showmigrations`: cadena de usuarios **0001–0042 aplicada**, junto con las migraciones Django y blacklist JWT, sobre una base vacía.
- `makemigrations --check --dry-run`: exit 0, **No changes detected**. `manage.py check`: exit 0.
- No se usaron dumps ni información escolar real. El `.env` local tiene valores aleatorios y está ignorado por Git.
- No se instaló un servicio Windows global. La instancia portátil local quedó disponible; ver `LOCAL_TESTING.md` y las rutas de esta sesión al final.

## HARDENING TESTS

Comando desde backend, con el Python 3.13 del entorno limpio:

```powershell
python manage.py test usuarios.test_hardening usuarios.test_websockets usuarios.test_seed usuarios.test_local_validation --noinput --verbosity 2
```

Resultado final: **61 tests, 0 failures, 0 errors; exit 0; 102.063 segundos**. Desglose: 50 hardening, 6 WebSocket, 2 seed y 3 validaciones locales adicionales. El runner creó y eliminó `test_sistema_escolar_local`; no vació la base de pruebas funcionales.

Incluye autenticación anónima rechazada, aislamiento de alumnos/familias, notas y cursos asignados, prohibición de escalar cuentas y de administrarse a sí mismo, refresco JWT, destinatarios de comunicados, edición parcial de eventos, stock y devoluciones, teléfonos exactos, metadatos de libros, historial de chat mayor a 200 mensajes y protección de endpoints push internos.

Los seis tests ASGI usan **InMemoryChannelLayer**, con PostgreSQL real. Verifican origen, autenticación, cuenta desactivada, heartbeat, recuperación de 205 mensajes y lectura de notificaciones propagada a dos conexiones. **No prueban Redis ni dos procesos Daphne.** `check_native` se ejecutó y terminó con exit 1: «La capa de canales debe ser Redis». Es una limitación explícita, no un PASS omitido.

## SEED TEST DATA

`seed_test_data` está implementado, es explícito y transaccional, exige development y base local; bloquea staging/production. Segunda ejecución: sin duplicaciones ni reseteo de registros editados, verificado además por tests.

Carga inicial: 19 usuarios/perfiles/notificaciones, 15 roles, 4 alumnos, 4 docentes, 2 preceptores, 7 registros de personal, 1 familia con dos hijos, 3 cursos (1°A, 2°B, 7°A), 3 materias/asignaciones/horarios, 4 notas, 4 registros en cada modelo de asistencia estudiantil utilizado, 1 comunicado, 1 evento, 1 libro, 1 préstamo, 1 grupo con cuatro integrantes y 206 mensajes totales (205 de grupo y uno directo).

Los E2E agregaron libros, grupos, eventos y comunicados ficticios: los conteos actuales pueden superar la carga inicial. Credenciales sintéticas y procedimiento están en `LOCAL_TESTING.md`; no deben trasladarse a staging. No se implementó `reset_test_data` porque no puede garantizarse un borrado selectivo seguro de relaciones modificadas manualmente. La guía documenta recreación manual de la base local descartable.

## FUNCTIONAL TESTING

| Rol o módulo | Evidencia ejecutada | Alcance pendiente |
|---|---|---|
| Admin | Login/logout, dashboard, edición de alumno y F5, sidebar móvil | Todas las variantes de CRUD de personas y catálogos |
| Dirección | Navegación entre módulos; sidebar consistente | CRUD completo de personal/reportes/comunicados |
| Vicedirección | Entrada/salida y scope backend sin escalamiento | Operaciones completas equivalentes a Dirección |
| Secretaría | Entrada/salida; pantallas conectadas a recursos persistentes | CRUD completo desde interfaz |
| Preceptoría | Horarios; asistencia guardada y recuperada | Todas las modificaciones de horarios y grupos |
| Profesor | Cursos asignados, nota persistida, calendario de lectura | Matriz de edición de todas las calificaciones |
| Familia | Entrada/salida y lectura de asistencia del hijo seleccionado | Todos los paneles de ambos hijos y permisos combinados |
| Biblioteca | Navegación; alta/edición de libro y F5; stock/transiciones en backend | Ciclo completo de préstamo desde UI de ambos roles |
| EOE | Buscar Cursos y navegación | Todos los campos sensibles y resoluciones |
| EMATP | Entrada/salida y notificaciones persistidas | CRUD completo de horarios |
| Estudiante, auxiliar y jefaturas | Entrada/salida y ausencia de «Rol no reconocido» | Acciones específicas de cada rol |
| Chat | Grupo con tres miembros agregados y envío; historial/aislamiento backend | Reconexión de navegador entre procesos reales y matriz manual completa |

`FUNCTIONAL_TESTING.md` contiene el protocolo restante. Sus casillas son instrucciones de aceptación, no resultados aprobados.

## PERSISTENCE

PASS por UI y recarga: domicilio/género/teléfono de familiar de alumno; nota docente; estado «Media Falta» de asistencia; lectura por familia seleccionando al hijo correcto; editorial/ubicación de libro. PASS de notificaciones después de F5, logout y nuevo login. El teléfono de prueba conservó exactamente espacios y símbolos: `  +54 11 1234 5678  `.

Pruebas backend adicionales cubren teléfonos y datos personales, notas, asistencia, lectura de notificaciones y metadatos. No extrapolar esas verificaciones a todos los formularios ni a concurrencia de usuarios reales.

## E2E

`npm run test:e2e -- --reporter=line`: **25 passed, 0 failed, 0 skipped, exit 0, 2.3 minutos** en Chromium, Vite y Daphne contra PostgreSQL 17. Suite: 13 smoke principales, 9 entradas/salidas de roles adicionales y 3 circuitos de persistencia.

Se corrigieron expectativas del smoke original: acceso a storage antes de navegar, mismo usuario admin para todos los roles, rutas URL inexistentes en una app que navega por estado y selectores que no representaban el DOM. No se transformaron aserciones en comprobaciones opcionales para obtener PASS.

Frontend: `npm ci` aprobado, 0 vulnerabilidades informadas por npm durante esa instalación; contratos **5/5**; ESLint **126 archivos, 0 errores y 0 advertencias**; build exit 0. Advertencia de build conservada: JS principal **931.85 kB**, gzip **195.37 kB**, superior a 500 kB. No es un error de compilación ni una certificación de rendimiento.

## BUGS FOUND / BUGS FIXED

| Problema corregido | Archivos principales / evidencia |
|---|---|
| Vicedirector sin dashboard o permisos operativos coherentes | `App.jsx`, `permissions.py`, `access.py`, `account_policy.py`; E2E de rol y test local |
| Botón de creación visible al profesor en calendario | `CalendarioMinima.jsx`; smoke 7 |
| Navegación de biblioteca/dirección divergente y cierre móvil | `App.jsx`, dashboards, `shared.css`; smoke 4, 9, 11 |
| Teléfonos de familiares mostrados pero omitidos al guardar alumno | `AgregarUsuario.jsx`; smoke 3 y hardening |
| Libros sin circuito de edición y metadatos persistentes completos | `biblioteca.jsx`, modelo/serializer/migración 0042; E2E de libro |
| Edición de inventario que podía ofrecer copias prestadas | `library_serializers.py`; test local de reserva de copias activas |
| Botones de aprobación/rechazo de préstamos ofrecidos al estudiante | `EstudiantePrestamos.jsx`; retirados, aprobación corresponde a biblioteca; build/lint |
| Notificaciones marcadas localmente antes de confirmar servidor | `NotificationBell.jsx`; E2E F5/logout y tests backend/ASGI |
| Duplicados visuales de evento por carrera entre REST y WS | Calendarios de Dirección/Preceptoría; upsert por ID, protección de submit; smoke 13 |
| Paneles con datos ficticios, acciones desconectadas o respuesta API mal interpretada | Paneles de Secretaría, Dirección, jefaturas y biblioteca; `LiveRecords.jsx`, `InstitutionalReport.jsx` |
| Health presentaba Redis configurado como validado | `auth_views.py`; ping real cuando Redis está configurado, estado not_tested con memoria; test local |
| Preflight podía aprobar puertos abiertos mediante `|| true`; entorno no transferido a Django | `deploy/scripts/preflight.sh`; fallo agregado, IPv4/IPv6 y EnvironmentFile; sintaxis Bash aprobada, runtime Linux pendiente |
| Smoke buscaba claves JSON anidadas como claves planas y confundía HTTP con WebSocket | `deploy/scripts/smoke-test.sh`; alcance HTTP explícito, Redis debe informar ok |
| Restore comprobaba tablas inexistentes y convertía errores en cero | `deploy/scripts/restore-test.sh`; nombres reales, ON_ERROR_STOP y validación del nombre de base; ejecución Linux pendiente |
| Node mínimo declarado incompatible con Vite instalado | `package.json`/lock: ^20.19.0 o >=22.12.0, según engines del Vite instalado |

## BUGS REMAINING

**Bloqueantes para declarar aceptación funcional total:** falta ejecutar el resto de la matriz manual indicada arriba, incluyendo altas/bajas y todas las resoluciones solicitadas. No se presenta esta falta de evidencia como un bug reproducido, ni se la oculta bajo los tests aprobados.

**Pendientes no bloqueantes de la prueba local:** optimizar división del bundle; ampliar pruebas de accesibilidad, carga/concurrencia y recuperación ante fallos de red; revisar de forma exhaustiva estados de error de cargadores heredados. La revisión realizada no acredita ausencia universal de fallos ni un pentest externo. Los scripts nativos corregidos tienen validación sintáctica, no validación operativa en Linux.

## HUAWEI PENDING

Redis 8 real y WebSocket entre procesos; Nginx con API y Upgrade; systemd y arranque tras reinicio; UFW/IPv6 y aislamiento; backup/restauración integral; smoke después de desplegar. Para producción se agregan TLS/DNS, SMTP/push si corresponde, rotación y revisión de secretos históricos, monitoreo y responsables. Nada de esto fue ejecutado contra Huawei.

## GIT

Se preservaron los cambios previos. El árbol contiene modificaciones y archivos nuevos de código, migraciones, pruebas y documentación. Los SQL históricos figuran eliminados del índice; no se borró historia de Git. No se realizó commit, push, rebase ni despliegue. No se agregaron `.env`, venv, node_modules, dumps o DB al índice. `git diff --check`: exit 0 después de normalizar whitespace. Un inventario SHA-256 y los estados/diff-stat están en el paquete de evidencia.

## Rutas locales de esta sesión

Venv usado: `C:\Users\Usuario\Documents\Codex\2026-09-10\h\work\validation313`. PostgreSQL: `C:\Users\Usuario\Documents\Codex\2026-09-10\h\work\postgresql17\pgsql\bin`. Cluster: `C:\Users\Usuario\Documents\Codex\2026-09-10\h\work\postgresql17-data`.

Para repetir en esta estación puede usarse ese `Scripts\python.exe` en lugar de crear otro venv. El backend debe iniciarse desde `sistema\backend`. La guía también permite una instalación independiente. La instancia local no sustituye el servicio permanente de servidor: Nginx servirá el build y systemd mantendrá Daphne una vez que se instalen y verifiquen en Huawei.

Estado al cerrar la validación: PostgreSQL permanece escuchando únicamente en 127.0.0.1:5432. Se detuvieron los procesos de prueba Daphne y Vite; 8000 y 5173 no quedaron escuchando. No son servicios de arranque automático.
