# Base nueva y migraciones

No trasladar Supabase, bases locales previas, dumps ni registros reales. Crear una base PostgreSQL 17 vacía para staging y otra independiente cuando se autorice producción. Conservar la cadena completa `backend/usuarios/migrations/0001…0042` y las migraciones de Django/JWT; no borrarlas, aplanarlas ni utilizar `--fake` para ocultar conflictos.

La migración 0038 ya amplía teléfonos a 53 caracteres; no duplicar ese cambio. La 0040 existente al iniciar el trabajo conserva su lugar en la cadena. La 0042 añade identidad de género a docente/personal y ajusta opciones de grupo y cargos de asistencia. Verificar `makemigrations --check --dry-run` antes de instalar.

Orden: confirmar nombre y host de la base vacía; `migrate --plan`; `migrate`; `showmigrations`; `check`; `check_native`; creación interactiva del primer administrador. Confirmar ausencia de alumnos, notas, asistencias, mensajes y préstamos antes de cargar datos sintéticos de aceptación. Mantener esas pruebas fuera de la futura base real.

La batería automatizada usa `backend.settings_test`, una base SQLite temporal y datos sintéticos. Esto verifica contratos y lógica, pero no equivale a migrar PostgreSQL 17 ni certifica bloqueo concurrente. La prueba PostgreSQL en Debian, las copias y una restauración independiente siguen pendientes.
