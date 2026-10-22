# Validación funcional por rol

Usar exclusivamente la base local y las cuentas ficticias de LOCAL_TESTING.md. Este archivo es el procedimiento reproducible; las casillas no implican ejecución. LOCAL-VALIDATION-REPORT.md contiene los resultados acreditados y sus evidencias.

Para cada operación: anotar rol, pantalla, ID del registro ficticio, acción, resultado esperado/observado, respuesta HTTP, persistencia después de F5 y resultado al cerrar/abrir sesión. Separar una API que rechaza correctamente un acceso de una interfaz que todavía muestra el botón indebido.

## Admin

- [ ] Ingresar, comparar contadores con listados completos y navegar desde cards.
- [ ] Crear estudiante; curso 7°, división y grupo A/B separados; guardar y F5.
- [ ] Editar dirección, teléfono con espacios y +, identidad de género y curso; comparar exactamente tras F5.
- [ ] Crear/editar/desactivar docente y preceptor; asignaciones y todos los campos persistidos.
- [ ] Crear familia, vincular dos estudiantes, cambiar vínculo y ocupación libre; F5.
- [ ] Crear/editar personal; domicilio, identidad, rol permitido y estado.
- [ ] Cursos: alta, filtros, detalle y activar/desactivar.
- [ ] Horarios: curso/turno, mover bloque, conflictos/recreos y permisos.
- [ ] Asistencia de personal: nombre, cargo válido, fecha/horas y guardar.
- [ ] Rechazar contraseña débil, asignación de rol indebida y administración de la propia cuenta por rutas de gestión.

## Dirección / Vicedirección

- [ ] Ingreso y dashboard correcto, contadores reales, alumnos y personal.
- [ ] Sidebar idéntica en Inicio, Calendario, Comunicados; sin Carga Notas ni Carga Asistencias.
- [ ] Reportes rápidos abren reportes con registros reales.
- [ ] Crear/editar evento y comunicado; audiencia válida; borrado autorizado.
- [ ] No elevar otra cuenta a admin ni modificar cuentas superiores.

## Secretaría

- [ ] Alta/edición/desactivación de personas permitidas y comprobación tras F5.
- [ ] Estudiantes, familias, personal, legajo, filtros, horarios y asistencia personal.
- [ ] Intentar crear/asignar admin o director: debe rechazarse en backend.

## Preceptoría

- [ ] Solo cursos/estudiantes asignados; selector real de horarios.
- [ ] Asistencia diaria: Presente, Ausente y Mitad de falta; guardar, F5 y verificar cada estado.
- [ ] Editar evento propio con precarga de título/fecha/hora/lugar/audiencia; rechazar ajeno.
- [ ] Comunicados filtrados por destinatario y curso.

## Profesor

- [ ] Mis Cursos refleja únicamente asignaciones reales.
- [ ] Notas: elegir curso/materia, cambiar nota, guardar, F5 y comparar.
- [ ] GET/POST/PATCH de notas de un curso ajeno deben rechazarse.
- [ ] Calendario sin controles de creación, edición ni eliminación; backend también rechaza.

## Familia / Estudiante

- [ ] Familia puede seleccionar sus dos estudiantes vinculados y consultar asistencia/notas permitidas.
- [ ] Estudiante solo ve sus propios datos.
- [ ] Intento de acceso por ID ajeno: rechazo, sin datos sanitarios ni académicos ajenos.
- [ ] Asistencia legible sin desbordes y estado persistente después de F5.

## Biblioteca

- [ ] Crear libro con título, autor, ISBN, editorial, año, categoría y ubicación; F5.
- [ ] Todos los Libros → Editar libro; modificar ubicación/metadatos y verificar F5.
- [ ] Préstamo: solicitar/aceptar una sola vez, consumir stock, devolver una sola vez.
- [ ] Rechazar préstamo pendiente sin alterar stock; impedir borrar libro con historial o préstamo activo.
- [ ] Rechazar stock incompatible con préstamos activos.
- [ ] Sidebar estable al pasar por Comunicados y Calendario.

## EOE / EMATP / roles adicionales

- [ ] EOE: Buscar Cursos abre cursos, navegación y datos conforme al alcance autorizado.
- [ ] EMATP: Inicio/Comunicados/Calendario/Horarios, selección curso/turno y navegación estable.
- [ ] Auxiliar, jefe de área, jefe de departamento y jefe de preceptores: ingreso, módulos propios y cierre de sesión.

## Chat y notificaciones

- [ ] Mensaje directo entre dos cuentas permitidas; rechazar destinatario no autorizado.
- [ ] Crear grupo seleccionando tres miembros además del creador; comprobar scroll y botón accesible.
- [ ] Enviar mensaje, F5, volver al grupo y verificar historial.
- [ ] Abrir grupo [TEST] de cuatro, cargar anteriores hasta recuperar los 205 mensajes sin repetidos.
- [ ] Recibir notificación, marcar leída, F5 y nuevo login; estado conservado.
- [ ] Dos pestañas reciben el cambio de lectura; desconexión/reconexión sin duplicados.
- [ ] Simular fallo de red al marcar leída: mensaje visible y no aparentar confirmación persistida.
- [ ] Repetir en Redis/múltiples procesos antes del despliegue; InMemory no lo certifica.

## Calendario / adaptable

- [ ] Audiencia vacía o curso inexistente rechazados.
- [ ] Hora actual modifica el campo inmediatamente; hora fin anterior a inicio rechazada.
- [ ] Enviar repetidamente un mismo formulario: una fila en DB y una tarjeta en UI.
- [ ] Cambiar audiencia elimina visibilidad/notificación del destinatario anterior.
- [ ] Probar 1920, 1366, 1024, 768 y 390 px: sidebar, overlay, tablas con desplazamiento, formularios y modal de grupo.

## Registro de bug

| ID | Rol/pantalla | Acción | Esperado | Observado | Causa | Archivo corregido | Regresión/retest |
|---|---|---|---|---|---|---|---|
| completar | | | | | | | |

No marcar PASS por ausencia de excepciones o por la existencia de un test. Una revisión manual parcial debe constar como PARTIAL y detallar qué recorridos quedaron sin ejecutar.
