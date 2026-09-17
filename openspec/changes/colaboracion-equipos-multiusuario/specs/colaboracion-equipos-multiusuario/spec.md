## ADDED Requirements

### Requirement: Acceso individual mediante enlace mágico

El sistema SHALL permitir que cada persona acceda con una cuenta propia mediante un enlace mágico enviado a su email, sin exigir una contraseña, y SHALL mantener una sesión identificable.

#### Scenario: Solicitar acceso

- **WHEN** una persona introduce un email válido y solicita acceso
- **THEN** el sistema envía un enlace mágico y no revela si el email ya tenía una cuenta

#### Scenario: Completar acceso

- **WHEN** la persona abre un enlace mágico válido
- **THEN** el sistema crea o recupera su cuenta, inicia sesión y muestra los equipos a los que pertenece

#### Scenario: Enlace inválido o caducado

- **WHEN** se usa un enlace inválido, usado o caducado
- **THEN** el sistema rechaza el acceso y permite solicitar uno nuevo

### Requirement: Equipos y membresías

El sistema SHALL permitir que un usuario cree un equipo y que otros usuarios se unan mediante una invitación controlada, manteniendo una membresía independiente por usuario y equipo.

#### Scenario: Crear equipo

- **WHEN** un usuario autenticado crea un equipo con un nombre válido
- **THEN** se crea el equipo y el usuario queda asociado como propietario

#### Scenario: Invitar colaborador

- **WHEN** el propietario invita a una dirección de email
- **THEN** el sistema crea una invitación limitada al equipo, con caducidad y rol inicial, y permite aceptarla tras autenticarse

#### Scenario: Acceso restringido

- **WHEN** un usuario intenta leer o modificar datos de un equipo al que no pertenece
- **THEN** el sistema rechaza la operación

### Requirement: Roles y permisos

El sistema SHALL soportar los roles `owner`, `editor` y `viewer` por equipo y SHALL aplicar los permisos en el servidor además de ocultar acciones no permitidas en la interfaz.

#### Scenario: Propietario administra el equipo

- **WHEN** un propietario gestiona miembros o configuración
- **THEN** puede invitar, cambiar roles, retirar miembros y modificar la configuración del equipo

#### Scenario: Editor registra actividad

- **WHEN** un editor crea una multa, registra un pago, añade saldo o registra una transacción
- **THEN** la operación se acepta y queda asociada al equipo y al usuario editor

#### Scenario: Usuario de consulta

- **WHEN** un usuario de consulta abre el equipo
- **THEN** puede consultar y compartir información, pero no puede modificar multas, pagos, saldos, transacciones, miembros ni configuración

### Requirement: Datos compartidos y sincronización casi en tiempo real

El sistema SHALL persistir los datos del equipo en un almacenamiento remoto centralizado y SHALL propagar los cambios a los demás miembros casi en tiempo real, manteniendo una caché local para cortes breves.

#### Scenario: Cambio visible para otro colaborador

- **WHEN** un editor registra una multa con conexión
- **THEN** el cambio se persiste remotamente y aparece en la vista de los demás miembros sin recargar manualmente

#### Scenario: Corte breve de conexión

- **WHEN** la conexión se interrumpe temporalmente
- **THEN** la aplicación conserva la última copia local, muestra el estado de sincronización y recupera los cambios al restablecerse la conexión

#### Scenario: Error de sincronización

- **WHEN** un cambio local no puede sincronizarse
- **THEN** el sistema informa del estado pendiente o fallido y no lo presenta como confirmado hasta recibir confirmación remota

### Requirement: Operaciones contables atómicas

El sistema SHALL ejecutar de forma atómica las operaciones que combinan una multa con consumo de saldo, y SHALL impedir que una misma multa o saldo se aplique dos veces por reintentos o concurrencia.

#### Scenario: Consumo concurrente

- **WHEN** dos usuarios intentan consumir simultáneamente el saldo de un jugador
- **THEN** el servidor serializa las operaciones, consume como máximo el saldo disponible y deja un resultado consistente

#### Scenario: Reintento idempotente

- **WHEN** un cliente reintenta una operación por pérdida de respuesta
- **THEN** el sistema devuelve el resultado de la operación original sin crear una multa, pago o movimiento duplicado

### Requirement: Auditoría de acciones

El sistema SHALL conservar quién y cuándo realizó las acciones relevantes sobre multas, pagos, saldos, transacciones, miembros y configuración.

#### Scenario: Consultar trazabilidad

- **WHEN** un usuario autorizado consulta una multa o movimiento
- **THEN** puede identificar el usuario responsable y la fecha de creación o modificación relevante

### Requirement: Migración del equipo local

El sistema SHALL permitir al propietario convertir los datos existentes de IndexedDB en un equipo remoto inicial sin perder jugadores, multas, recargos, transacciones ni movimientos de saldo.

#### Scenario: Migrar datos existentes

- **WHEN** el propietario inicia la migración de una instalación local válida
- **THEN** se crea un equipo remoto, se suben los datos una sola vez y se conserva una copia local de respaldo

#### Scenario: Repetir migración

- **WHEN** el propietario repite o reanuda una migración interrumpida
- **THEN** el sistema evita duplicar registros y muestra qué elementos se importaron o quedaron pendientes
