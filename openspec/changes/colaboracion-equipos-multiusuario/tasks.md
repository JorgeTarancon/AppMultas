## 1. Infraestructura y autenticación

- [ ] 1.1 Configurar proyecto Supabase, variables públicas del frontend y migraciones SQL versionadas.
- [ ] 1.2 Crear tablas de equipos, membresías, invitaciones y auditoría con índices y restricciones.
- [ ] 1.3 Configurar autenticación por enlace mágico, callback de sesión y cierre de sesión.
- [ ] 1.4 Crear políticas RLS para aislar los datos por membresía y validar roles en servidor.
- [ ] 1.5 Implementar creación del primer equipo y asignación automática del rol `owner`.

## 2. Modelo de datos compartido

- [ ] 2.1 Convertir jugadores, tipos de multa, multas, recargos, transacciones y movimientos de saldo a tablas con `team_id`.
- [ ] 2.2 Añadir `created_by`, `updated_by`, marcas temporales y claves de idempotencia donde sean necesarias.
- [ ] 2.3 Crear relaciones, restricciones de importes en céntimos y referencias entre multas, recargos y consumos.
- [ ] 2.4 Adaptar los tipos de dominio TypeScript para representar usuario, equipo, rol, estado de sincronización y comandos pendientes.
- [ ] 2.5 Separar la fuente remota de verdad de la caché local sin romper la carga de datos locales existentes.

## 3. Invitaciones y permisos

- [ ] 3.1 Implementar invitaciones por email con token de un solo uso, rol inicial y caducidad.
- [ ] 3.2 Permitir aceptar una invitación después de completar el acceso por enlace mágico.
- [ ] 3.3 Implementar gestión de miembros para el propietario: invitar, cambiar rol y retirar acceso.
- [ ] 3.4 Aplicar permisos en funciones de servidor y reflejarlos en los controles visibles de la interfaz.
- [ ] 3.5 Verificar que un usuario no pueda leer ni modificar datos de equipos ajenos manipulando peticiones.

## 4. Operaciones de dominio y contabilidad

- [ ] 4.1 Implementar función atómica para crear una multa y consumir saldo disponible una sola vez.
- [ ] 4.2 Implementar operaciones idempotentes para marcar multas como pagadas y aplicar recargos.
- [ ] 4.3 Implementar depósitos, consumos y transacciones con referencias de equipo, usuario y entidad relacionada.
- [ ] 4.4 Registrar auditoría de creación, modificación, pago, consumo, eliminación y cambios de configuración.
- [ ] 4.5 Resolver concurrencia financiera con transacciones PostgreSQL y bloqueo de filas relevantes.
- [ ] 4.6 Cubrir reintentos de red sin duplicar multas, pagos, depósitos, consumos ni gastos.

## 5. Sincronización y caché local

- [ ] 5.1 Implementar repositorio remoto para snapshots y operaciones incrementales.
- [ ] 5.2 Mantener snapshot por equipo en IndexedDB y cargarlo mientras se obtiene la versión remota.
- [ ] 5.3 Suscribirse a cambios Realtime filtrados por equipo y aplicar eventos de forma idempotente.
- [ ] 5.4 Crear cola de comandos pendientes para cortes breves y reintentos con backoff.
- [ ] 5.5 Mostrar estados de sincronización: sincronizado, pendiente, sin conexión y error.
- [ ] 5.6 Resolver conflictos de edición en servidor y mostrar al usuario los cambios rechazados o pendientes.

## 6. Interfaz colaborativa

- [ ] 6.1 Crear pantalla de acceso por email y flujo de retorno desde el enlace mágico.
- [ ] 6.2 Añadir selector, creación y cambio de equipo.
- [ ] 6.3 Añadir pantalla de miembros, invitaciones y roles para propietarios.
- [ ] 6.4 Mostrar usuario responsable y estado de sincronización en las vistas relevantes.
- [ ] 6.5 Adaptar multas, jugadores, saldos y transacciones para usar el repositorio compartido.
- [ ] 6.6 Ocultar acciones no permitidas y mostrar mensajes claros ante permisos insuficientes.
- [ ] 6.7 Añadir estados de carga, error, reintento y datos locales pendientes de confirmar.

## 7. Migración y respaldo

- [ ] 7.1 Detectar datos locales existentes y ofrecer migrarlos al primer equipo remoto.
- [ ] 7.2 Generar identificadores estables y subir datos por lotes con idempotencia.
- [ ] 7.3 Validar conteos, referencias y totales contables antes de completar la migración.
- [ ] 7.4 Conservar la copia local y añadir exportación JSON como respaldo antes de migrar.
- [ ] 7.5 Permitir reanudar una migración interrumpida sin duplicar registros.

## 8. Verificación y despliegue

- [ ] 8.1 Probar autenticación, sesiones, invitaciones, aislamiento RLS y los tres roles.
- [ ] 8.2 Probar dos usuarios registrando multas, pagos, saldos y transacciones sobre el mismo equipo.
- [ ] 8.3 Probar consumo concurrente, idempotencia, reconexión y recepción casi en tiempo real.
- [ ] 8.4 Probar migración desde datos IndexedDB con precargas, recargos, pagos y gastos existentes.
- [ ] 8.5 Documentar variables, configuración del email, migraciones SQL y procedimiento de despliegue.
- [ ] 8.6 Verificar que los datos y secretos no se exponen en el cliente y que las políticas remotas bloquean accesos indebidos.
