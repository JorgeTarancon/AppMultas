## Why

Un equipo de fútbol necesita gestionar sus multas desde un único dispositivo sin obligar a los jugadores a crear cuentas o iniciar sesión. La aplicación centralizará las multas, los pagos, los recargos y la contabilidad, y facilitará comunicar las cantidades pendientes por WhatsApp.

## What Changes

- Crear una aplicación PWA instalable y usable desde un único dispositivo.
- Crear un equipo y administrar su lista de jugadores sin autenticación individual.
- Crear un catálogo de multas con descripción e importe predeterminado.
- Asignar multas concretas a jugadores con una fecha determinada.
- Configurar por equipo si se aplican recargos por pago tardío.
- Aplicar un recargo fijo cada semana completa mientras una multa siga pendiente.
- Registrar únicamente pagos completos y conservar la fecha de pago.
- Permitir eliminar, con confirmación, multas pendientes creadas por error y multas pagadas del histórico.
- Mostrar totales pagados, totales pendientes y ranking de recaudación por jugador.
- Generar un mensaje de WhatsApp agrupado por jugador, con fecha de multa, total individual, total pendiente y total recaudado históricamente.
- Mantener los datos en almacenamiento local del dispositivo, sin cuentas ni servidor en la primera versión.

## Capabilities

### New Capabilities

- `gestion-multas-equipo`: Gestión local de equipos, jugadores, catálogo y asignación de multas, recargos, pagos, eliminación, contabilidad, ranking y exportación del resumen pendiente.

### Modified Capabilities

No existen capacidades previas en el proyecto.

## Impact

- Nueva interfaz de usuario para el flujo completo de administración del equipo.
- Nuevo modelo de datos local para equipos, jugadores, tipos de multa, multas asignadas, recargos y pagos.
- Cálculo de fechas, vencimiento semanal y recargos repetidos de forma idempotente.
- Integración con las capacidades de compartir texto del dispositivo y fallback para abrir o copiar el mensaje destinado a WhatsApp.
- No se introducen cuentas, backend, sincronización entre dispositivos ni integración autenticada con WhatsApp.