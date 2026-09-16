## Purpose

Esta capacidad permite a una persona administrar desde un único dispositivo las multas de un equipo de fútbol, registrar pagos completos y comunicar las cantidades pendientes sin cuentas individuales ni conexión con un servidor.

## ADDED Requirements

### Requirement: Gestionar equipo y jugadores
El sistema MUST permitir crear un equipo, modificar su nombre y mantener una lista de jugadores con nombre y estado activo o inactivo. Los jugadores no necesitan autenticación individual.

#### Scenario: Crear un equipo y sus jugadores
- **WHEN** la persona administradora introduce un nombre de equipo y añade varios jugadores
- **THEN** el sistema guarda el equipo y muestra cada jugador disponible para recibir multas

#### Scenario: Desactivar un jugador
- **WHEN** la persona administradora marca un jugador como inactivo
- **THEN** el jugador deja de aparecer como opción predeterminada para nuevas multas y conserva sus multas y estadísticas existentes

### Requirement: Gestionar el catálogo de multas
El sistema MUST permitir crear, editar y eliminar tipos de multa con descripción e importe predeterminado.

#### Scenario: Crear un tipo de multa
- **WHEN** la persona administradora introduce una descripción y un importe válido
- **THEN** el tipo queda disponible para asignarlo a un jugador

#### Scenario: Rechazar un importe inválido
- **WHEN** se intenta guardar un tipo sin descripción o con importe cero, negativo o no numérico
- **THEN** el sistema impide guardar el tipo e indica qué dato debe corregirse

### Requirement: Asignar multas con fecha
El sistema MUST permitir asignar a un jugador una multa del catálogo o una descripción e importe equivalentes, conservando en la multa asignada la descripción e importe vigentes en ese momento y una fecha elegida por la persona administradora.

#### Scenario: Registrar una multa
- **WHEN** la persona administradora selecciona un jugador, una descripción, un importe y una fecha
- **THEN** el sistema crea una multa pendiente con esos datos y la muestra en el listado del jugador

#### Scenario: Impedir una asignación incompleta
- **WHEN** falta el jugador, la descripción, el importe o la fecha
- **THEN** el sistema no crea la multa y señala los campos obligatorios

### Requirement: Aplicar recargos semanales opcionales
El sistema MUST permitir activar o desactivar por equipo los recargos por pago tardío. Cuando estén activos, MUST añadir un importe fijo configurable por cada semana completa transcurrida desde la fecha de la multa mientras esta permanezca pendiente.

#### Scenario: Equipo sin recargos
- **WHEN** la opción de recargos está desactivada
- **THEN** una multa pendiente conserva su importe original independientemente del tiempo transcurrido

#### Scenario: Añadir recargos por semanas completas
- **WHEN** la opción está activa, existe un recargo fijo de 2 euros y una multa de 10 euros lleva 14 días pendiente
- **THEN** el importe actual de la multa es 14 euros y se muestran dos recargos semanales

#### Scenario: Recalcular sin duplicar recargos
- **WHEN** la persona abre la aplicación varias veces después de que venza una o más semanas
- **THEN** el sistema muestra el mismo importe y no añade dos veces el recargo correspondiente a una misma semana

### Requirement: Registrar pagos completos y eliminar multas
El sistema MUST permitir marcar una multa pendiente como pagada en su totalidad, guardar la fecha de pago y eliminar con confirmación tanto multas pendientes como multas pagadas.

#### Scenario: Pagar una multa completa
- **WHEN** la persona administradora confirma el pago de una multa pendiente
- **THEN** la multa cambia a pagada, conserva su importe final y registra la fecha de pago

#### Scenario: Eliminar una multa pendiente por error
- **WHEN** la persona administradora solicita eliminar una multa pendiente y confirma la acción
- **THEN** la multa deja de aparecer en pendientes, contabilidad y mensajes exportados

#### Scenario: Eliminar una multa pagada del histórico
- **WHEN** la persona administradora solicita eliminar una multa pagada y confirma la acción
- **THEN** la multa deja de aparecer en el histórico, el total recaudado y el ranking se recalculan

### Requirement: Mostrar contabilidad y ranking
El sistema MUST mostrar el total pendiente, el total recaudado de multas pagadas no eliminadas y un ranking por jugador basado en el importe pagado acumulado.

#### Scenario: Consultar el resumen contable
- **WHEN** existen multas pendientes y pagadas para varios jugadores
- **THEN** el resumen muestra por separado el total pendiente, el total recaudado y el ranking ordenado por importe pagado de mayor a menor

### Requirement: Compartir pendientes por WhatsApp
El sistema MUST generar un mensaje de texto agrupado por jugador que incluya cada multa pendiente con su fecha, descripción e importe actual, el total de cada jugador, el total pendiente y el total recaudado históricamente.

#### Scenario: Generar el mensaje agrupado
- **WHEN** la persona administradora solicita compartir las multas pendientes
- **THEN** el mensaje agrupa las multas bajo cada jugador y muestra al final los totales pendiente y recaudado

#### Scenario: Compartir o copiar el mensaje
- **WHEN** el dispositivo ofrece una función de compartir
- **THEN** el sistema abre el selector de compartir con el texto preparado y permite elegir WhatsApp
- **WHEN** el dispositivo no ofrece esa función
- **THEN** el sistema permite copiar el texto y ofrece una alternativa para abrir WhatsApp con el mensaje preparado

### Requirement: Persistir los datos localmente
El sistema MUST conservar los datos del equipo en el almacenamiento local del dispositivo y funcionar sin una cuenta o servidor remoto.

#### Scenario: Reabrir la aplicación sin conexión
- **WHEN** la persona cierra y vuelve a abrir la aplicación sin conexión a internet
- **THEN** el equipo, jugadores, multas, pagos, recargos y estadísticas siguen disponibles en el mismo dispositivo