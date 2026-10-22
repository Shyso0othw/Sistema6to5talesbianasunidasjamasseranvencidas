# Auditoría integral del sistema escolar EESTN1

**Fecha: 14 de septiembre de 2026. Estado: funcionalidad local demostrada en los circuitos probados; aceptación total pendiente.**

## 1. Dictamen

El sistema dejó de depender de una base remota para esta validación: funciona localmente con PostgreSQL 17.11, Python 3.13.15, Django/DRF, Daphne/Channels y React/Vite. Se aplicó la cadena de migraciones sobre una base vacía y se ejecutaron **61 tests backend, 25 E2E y 5 contratos frontend, todos aprobados**. ESLint terminó sin errores ni advertencias; la compilación terminó correctamente con advertencia de tamaño del bundle.

**No corresponde afirmar «todo corregido» ni certificar producción.** Las pruebas acreditan los flujos descritos, no todas las combinaciones de roles, operaciones, resoluciones y concurrencia. La aceptación manual completa solicitada sigue pendiente. El candidato de staging no se considera congelado y no se hizo commit automático. No se accedió al Huawei ni se cargaron datos reales.

El detalle reproducible, errores corregidos, comandos y límites está en `LOCAL-VALIDATION-REPORT.md`. Este documento agrega visión arquitectónica, cobertura del informe histórico y evaluación transversal.

## 2. Objeto, alcance y método

Se trabajó sobre `C:\Users\Usuario\Desktop\sistema`, preservando cambios previos. El pedido vigente es la continuación de correcciones con PostgreSQL local, seed ficticio y validación funcional; los informes previos fueron utilizados como hallazgos a contrastar, no como prueba de que cada afirmación histórica seguía vigente.

Inventario anterior a incorporar los informes finales: **24.696 archivos físicos, excluyendo `.git`**; 24.210 corresponden a directorios de dependencias/cachés y 486 a otros archivos. El manifiesto de código y archivos elegibles de Git contiene **470 archivos, 5.256.960 bytes**, con ruta, tamaño y SHA-256. Los informes nuevos incrementan esas cifras. Un hash acredita identificación, no lectura semántica.

La revisión combina inspección de arquitectura, modelos, permisos, rutas, settings, serializers, consumidores, formularios y despliegue; contraste de hallazgos; ejecución sobre PostgreSQL limpio; pruebas ASGI y navegador; build/lint y revisión de Git. **No se afirma haber leído línea por línea los 24.210 archivos de terceros**, ni haber realizado análisis de vulnerabilidades completo de todas las dependencias. Tampoco se midió cobertura de líneas con coverage. Esto delimita el significado de «integral»: todos los subsistemas están contemplados; no equivale a una garantía de ausencia de defectos.

## 3. Qué es y cómo está estructurado

Es una aplicación de gestión escolar interna: cuentas y roles, legajos, cursos, materias, asignaciones docentes, notas, asistencia, horarios, comunicaciones, eventos, chat, notificaciones y biblioteca. Sus datos incluyen información personal y educativa, por lo que el aislamiento por objeto y por destinatario es una condición funcional central.

| Capa | Estructura y responsabilidad |
|---|---|
| Interfaz | `frontend/src/App.jsx`, páginas por rol, componentes compartidos y hooks. React navega principalmente mediante estado; no deben suponerse URLs de módulos inexistentes. |
| HTTP | Adaptador `frontend/src/api/http.js`, API relativa `/api`, paginación y refresh JWT. |
| Backend | Aplicación Django `usuarios`; modelos/serializers/views divididos por dominio; DRF aplica autenticación, permisos de acción y scope. |
| Autorización | `permissions.py`, `access.py`, `account_policy.py`, `audience.py`; combina rol, asignaciones, vínculos familiares y destinatarios. |
| Datos | PostgreSQL, relaciones entre cuentas/perfiles y registros escolares; 42 migraciones de usuarios, más migraciones de Django/JWT. |
| Tiempo real | ASGI, consumidores Channels, historial persistido en `Mensaje` y `Notificacion`; WebSocket transporta novedades. |
| Configuración | Paquete de settings development/staging/production; development carga `.env` local, los entornos de servidor usan variables externas. |
| Operación prevista | Nginx para archivos compilados y proxy, Daphne supervisado por systemd, PostgreSQL/Redis internos; plantillas en `deploy/`. |

Para abrir el sistema instalado en servidor no se necesita iniciar frontend y backend desde cada equipo. Nginx sirve `frontend/dist`; systemd mantiene Daphne iniciado y lo reinicia si falla. El usuario abre una URL. **La preparación de estas piezas no significa que el servidor ya esté instalado o que se haya probado su reinicio.** Localmente Vite y Daphne siguen siendo procesos de desarrollo/prueba.

## 4. Resultado transversal

### Seguridad y privacidad

Se corrigieron acceso anónimo a recursos sensibles, escalamiento mediante gestión de cuentas, lectura/escritura fuera del scope, grupos ajenos y destinatarios demasiado amplios. Los tests verifican ejemplos negativos y positivos, no solamente respuestas exitosas. Login público y refresh con blacklist tienen pruebas. El acceso de vicedirección se alineó con Dirección sin habilitar asignación de administrador o dirección.

Los permisos deben seguir viviendo en backend: ocultar botones es coherencia de interfaz, no una barrera de seguridad. Salud/datos sensibles, vínculos familiares y asignaciones docentes requieren seguir ampliando la matriz de regresión cuando se incorporen roles combinados o cambien reglas institucionales.

No se certificó rotación de credenciales que hubieran quedado expuestas históricamente. Quitar SQL del índice y usar secretos nuevos localmente no limpia commits viejos, equipos o servicios externos. No se reescribió historia ni se contactaron servicios para revocar credenciales.

### Integridad y persistencia

Hay evidencia de escritura y lectura posterior de teléfonos exactos, domicilio/género, notas, asistencia, metadatos de libros y lectura de notificaciones. Se corrigió inventario con transacciones y locks: aceptar consume stock, devolver lo repone una sola vez y editar no puede ofrecer copias prestadas. Libros con historial de préstamos no pueden eliminarse de forma que destruya ese historial.

No se ejecutaron pruebas de carga o carreras masivas. La presencia de `atomic` o un lock en un circuito no acredita que todas las escrituras del sistema sean inmunes a concurrencia. Los horarios requieren especialmente ampliar pruebas entre ciclos con franjas diferentes y entre docentes compartidos.

### Interfaz y experiencia

Se conectaron paneles que mostraban datos ficticios o acciones desconectadas con endpoints existentes. Se corrigieron navegación de Dirección/Biblioteca, vicedirección sin dashboard, calendario docente, edición de libros y sidebar móvil de administrador. El alumno dejó de ver acciones de aprobación que el backend le rechazaba.

El smoke de entrada por rol sólo acredita que abre su pantalla y puede salir. No demuestra CRUD completo de cada módulo. La evidencia responsive incluye el caso móvil de administrador; no certifica todas las pantallas a 1920/1366/1024/768 píxeles. Los estados de error heredados deben terminar de verificarse mediante fallos de red inducidos.

### Chat, notificaciones y calendario

Se verificaron grupo con tres miembros agregados, envío, aislamiento, historial mayor a 200, cursores backend y lectura propagada a dos conexiones ASGI. Notificaciones conservaron lectura después de F5 y nuevo login. Se corrigieron confirmación prematura de lectura y duplicados visuales de eventos por llegada simultánea REST/WS.

El transporte local funciona con Channels en memoria y un proceso. Falta Redis 8 real, dos procesos, proxy WebSocket, reconexión de navegador y pruebas completas de dos ventanas bajo ese despliegue. No se sustituye esa evidencia por tener instalado el paquete Python `redis==8.0.0`: el cliente no es el servidor Redis.

### Operación y mantenibilidad

Se mantuvo la arquitectura, se separaron entornos, se incorporaron guías y pruebas y se conservaron las migraciones. Los scripts nativos recibieron correcciones concretas para evitar falsos PASS de puertos, entorno, JSON de health y restauración. Los cuatro scripts pasan sintaxis Bash; no se ejecutaron servicios Linux desde esta estación.

Hay deuda técnica: componentes de dashboard extensos, navegación repetida por rol, acoplamiento entre estado de interfaz y formularios, datos docentes de horarios basados en texto y bundle principal grande. No se recomienda una reescritura masiva para cerrar esta fase; conviene proteger cada circuito con pruebas y extraer duplicaciones cuando se modifique ese circuito.

## 5. Trazabilidad del informe anterior

Estados: **V** = corrección con evidencia específica; **P** = implementación/revisión parcial, sin aceptación completa; **E** = depende de infraestructura externa. Un V no implica cobertura universal de su dominio.

| Hallazgo | Estado | Evidencia / límite |
|---|---|---|
| S01 cuentas y escalamiento | V | Política central y tests de roles superiores/autogestión |
| S02 APIs sensibles anónimas | V | Permisos y batería de endpoints sin token |
| S03 asistencia ajena/escritura estudiante | V | Scope y tests de rechazo |
| S04 datos de terceros | V/P | Tests alumno/familia/docente; matriz sensible completa pendiente |
| S05 secretos y dumps | P/E | Índice actual sin SQL/env; historia y revocación no certificadas |
| S06 chat de grupo ajeno | V | REST/ASGI y pruebas de scope |
| S07 destinatarios amplios | V/P | Audiencias y revocación probadas; combinaciones completas pendientes |
| S08 configuración/producción | P/E | Settings y checks; infraestructura real pendiente |
| N01 login autenticado por error | V | Login AllowAny y credenciales válidas/inválidas |
| N02 paginación rompe arrays | V | Adaptador compartido, segunda página y contratos |
| N03 perfil profesor | V | Contrato de perfil y ruta compartida |
| N04 settings no seleccionados | V | Selector conectado; entorno inválido falla |
| N05 refresh sin blacklist | V | Rotación y token previo invalidado |

| ID de requerimiento | Estado | Evaluación |
|---|---|---|
| 0 | V/P | Correcciones localizadas y persistentes; aceptación integral no cerrada |
| 1 | E | Objetivo nativo preparado, no instalado |
| 2 | V | PostgreSQL vacío |
| 3 | V | N01–N05 con evidencia |
| 4 | V/P | Política de cuentas; todas las combinaciones visuales pendientes |
| 5 | P | Desarrollo separado; ngrok no ejecutado |
| 6 | V | Teléfonos hasta 53 caracteres y espacios preservados |
| 7 | V/P | Campos personales/modelos/formularios; no todos los roles editados por UI |
| 8 | P | Altas con validación; matriz de todos los roles incompleta |
| 9 | P | Contadores usan API; recálculo de todas las tarjetas no recorrido |
| 10 | V/P | Navegación de admin revisada; no cada acción de cada tarjeta |
| 11 | V/P | Alumno, año 7 y grupos A/B; edición F5, CRUD completo pendiente |
| 12 | P | Cursos/filtros/asignaciones; activación completa pendiente |
| 13 | P | Docentes conectados; todos los filtros/asignaciones no aceptados manualmente |
| 14 | V/P | Asignación numérica preceptor probada; formulario completo pendiente |
| 15 | V/P | Vínculo familiar y varios hijos; CRUD visual completo pendiente |
| 16 | P | Gestión personal revisada; todas las resoluciones pendientes |
| 17 | V | Sidebar de Dirección y módulos permitidos |
| 18 | V/P | Scope de comunicados probado; matriz total no cubierta |
| 19 | P | Reportes con API; aceptación de todos los reportes pendiente |
| 20 | V/P | Deduplicación, edición y calendario profesor probado; resto de combinaciones pendiente |
| 21 | V/P | Guardado de comunicado confirmado; CRUD UI completo pendiente |
| 22 | V/P | F5/logout y dos conexiones ASGI; dos navegadores con Redis pendiente |
| 23 | V/P | Grupo y >200 mensajes; reconexión completa en infraestructura pendiente |
| 24 | P | Horarios cargan, movimiento probado; matriz completa pendiente |
| 25 | P | Asistencia de personal conectada; circuitos por cargo pendientes |
| 26 | V | Estados de asistencia persistidos, prueba UI |
| 27 | V | Docente ve cursos asignados |
| 28 | V | Nota persistida y bloqueo de materia/alumno ajenos |
| 29 | V/P | Familia lee hijo seleccionado; todas las resoluciones pendientes |
| 30 | V | Buscar Cursos de EOE |
| 31 | V/P | Catálogo/edición/stock probados; préstamo UI integral pendiente |
| 32 | P | EMATP abre; navegación y horario completos pendientes |
| 33 | P | Móvil admin probado; matriz de tamaños restante pendiente |
| 34 | V/P | Política documentada y casos negativos; combinaciones exhaustivas pendientes |
| 35 | P | Secretaría abre y reutiliza CRUD; aceptación completa pendiente |
| 36 | V/P | Contratos de filtros combinados; todas las tablas pendientes |
| 37 | P | Paneles ficticios identificados sustituidos; no garantía de cada contador |
| 38 | V | npm ci, contratos, lint y build; advertencia de tamaño explícita |
| 39 | P | Correcciones de confirmación/errores; fallos de red exhaustivos pendientes |
| 40 | V | API y WS del mismo origen, proxy local |
| 41 | E | Redis real pendiente y explícito en health/check_native |
| 42 | V/P | Entornos/secretos locales; historial pendiente |
| 43 | E | Plantillas nativas, ejecución en servidor pendiente |
| 44 | V | Documentación de instalación, seguridad, checklist y DB |
| 45 | V | Python limpio y PostgreSQL real |
| 46 | V | 50 tests hardening más suites complementarias |
| 47 | P | 25 E2E; aceptación manual completa pendiente |
| 48 | V | Checks, migraciones completas y sin drift |
| 49 | V/P | Estado/diff/inventario; revisión final de commit por hacer |
| 50 | V/P | Flujos probados usan DB; no se certifica toda interacción heredada |
| 51 | V | Reportes con evidencia, límites y estados |
| 52 | P/E | Base técnica preparada; aceptación local completa y servidor pendientes |
| 53 | E | TLS/DNS/backup/Linux no ejecutados |
| 54 | V | Secuencia priorizó seguridad/persistencia antes de aceptación |
| 55 | V | Cambios backend reales y sin tocar Huawei |

## 6. Pendientes y criterios concretos de cierre

1. **Aceptación funcional local — bloquea el freeze solicitado:** completar las casillas de `FUNCTIONAL_TESTING.md` con resultado fechado por rol, alta/edición/baja, lectura posterior, errores y resoluciones. Lo no ejecutado debe permanecer pendiente. Añadir regresión al reproducir cualquier fallo.
2. **Infraestructura — bloquea staging operativo:** instalar/verificar Redis 8, Nginx, systemd y aislamiento IPv4/IPv6 en el entorno autorizado; probar reinicio, dos procesos Daphne, WS y accesibilidad desde equipo autorizado.
3. **Operación con información real — bloquea producción:** secretos nuevos/revocación histórica, permisos de DB mínimos, TLS/DNS, copias protegidas y restauración integral comprobada, monitoreo y responsables.
4. **Mejoras no bloqueantes de los flujos locales probados:** división del bundle, accesibilidad, carga/concurrencia y simplificación gradual de componentes duplicados. No se alteraron umbrales para esconder advertencias.

No se declara un bug concreto donde sólo falta una prueba. A la inversa, una prueba no ejecutada no recibe PASS. Los scripts con sintaxis válida deben ejecutar sus comprobaciones reales en Linux antes de servir como evidencia de operación.

## 7. Evidencia entregada y preservación

`LOCAL-VALIDATION-REPORT.md` contiene los comandos, versiones, resultados y bugs corregidos con archivos/tests. `LOCAL_TESTING.md` permite reproducir el entorno; `FUNCTIONAL_TESTING.md` detalla aceptación pendiente. Los documentos de despliegue siguen diferenciando staging privado y producción.

El paquete `outputs/auditoria-final-2026-09-14` de la tarea contiene ambos informes, logs seleccionados de pruebas/migraciones, resumen de lint, inventario SHA-256 y estado/diff de Git. No contiene `.env`, secretos de PostgreSQL, bases, dumps, dependencias ni datos escolares. No se hizo commit, push o despliegue. Las eliminaciones de SQL ya presentes en el índice no equivalen a eliminación de la historia del repositorio.
