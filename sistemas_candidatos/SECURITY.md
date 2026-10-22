# Seguridad y permisos

El backend decide permisos y alcance; modificar roles guardados en el navegador no concede acceso. `usuarios/account_policy.py` controla la asignación de cuentas; `permissions.py` controla acciones; `access.py` restringe objetos; `audience.py` restringe destinatarios. Revisar estos cuatro niveles al añadir una ruta.

| Actor | Roles que puede asignar |
|---|---|
| Administrador | Todos los roles definidos |
| Director / vicedirector | Roles operativos, Secretaría y jefaturas; no administrador ni dirección |
| Secretaría | Profesor, preceptor, estudiante, familia, auxiliar, biblioteca, EMATP y EOE |
| Jefe de área / departamento | Profesor, estudiante y familia |
| Jefe de preceptores | Preceptor, estudiante y familia |
| Otros | Ninguno |

La asignación es una condición adicional: cada ruta también exige su permiso de acción. Vicedirección hereda los permisos operativos de Dirección y dispone de su dashboard; la política de asignación de cuentas sigue prohibiendo otorgar administrador o dirección. La matriz visual usa los mismos conjuntos; debe mantenerse sincronizada con las pruebas del backend. No se permite administrar la propia cuenta mediante los endpoints de personal ni modificar cuentas de nivel superior.

Notas y asistencia exigen alumno/curso/materia autorizados. Familias y estudiantes acceden a los registros vinculados. Los campos sanitarios se omiten para actores sin autorización; su escritura administrativa se valida en el servidor. Profesores tienen calendario de lectura. La edición de eventos y comunicados también comprueba autoría o permiso administrativo. Cambiar destinatarios retira notificaciones anteriores sin divulgar el nuevo contenido.

JWT: acceso de 30 minutos, renovación rotativa y lista negra de refresh usados. WebSocket comprueba JWT, actividad de la cuenta y origen permitido. No registrar URL de WebSocket con query: contiene el token. Nginx desactiva ese access log y Daphne usa `/dev/null` para accesos; los errores operativos siguen en journald. La duración/revocación de conexiones abiertas debe verificarse antes de exposición pública.

Secretos fuera de Git mediante el archivo de entorno de systemd. `.env.example` no contiene credenciales operativas. Las copias SQL y secretos que ya estuvieron en el historial requieren revisión y rotación por sus responsables: cambiar el árbol actual no elimina el historial ni revoca credenciales externas. No se ha reescrito el historial ni se han rotado servicios ajenos durante esta corrección.

No publicar datos de alumnado en incidencias, logs o fixtures. Documentar hallazgos reproducibles con datos sintéticos y restringir el acceso a los informes. Revisar autorización en cada nueva consulta, descarga, mensaje y operación masiva.
