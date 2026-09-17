# Why

Actualmente las multas solo se pagan cuando se marca el pago y los jugadores no tienen un saldo individual previamente aportado. Esto obliga a registrar como pago movimientos que ya se habían ingresado al bote y no permite reflejar correctamente aportaciones anticipadas ni el importe restante de cada jugador.

# What Changes

- Añadir un saldo precargado independiente para cada jugador, inicialmente igual a cero.
- Permitir ingresar aportaciones al saldo de un jugador mediante una transacción explícita con importe, fecha y trazabilidad.
- Mostrar el saldo disponible junto a cada jugador.
- Cuando se registra una multa, consumir automáticamente el saldo del jugador para cubrirla y marcarla como pagada si queda totalmente cubierta.
- Si el saldo no cubre toda la multa, consumir el saldo disponible y registrar que solo queda pendiente la diferencia; el importe restante será el que deba pagar el jugador.
- Mostrar el saldo precargado desde el momento de la aportación en el total del bote, sin esperar a que se use para una multa.
- Conservar el historial de aportaciones y consumos de saldo para que el saldo y los pagos sean auditables.

# Capabilities

## New Capabilities
- `saldo-precargado-jugadores`: gestionar saldos individuales, consumirlos al registrar multas y mantener la trazabilidad de aportaciones y consumos.

## Modified Capabilities
- `transacciones-bote`: incluir las aportaciones de saldo en los ingresos del bote y distinguirlas de otros ingresos manuales.
- `gestion-multas-equipo`: aplicar automáticamente el saldo del jugador al crear una multa y reflejar pagos completos o parciales.

# Impact

- `src/domain.ts`: modelo de saldo, movimientos de saldo, aplicación de saldo a multas y resumen financiero.
- `src/storage.ts`: persistencia y normalización compatible de saldos y movimientos existentes.
- `src/main.ts`: formulario de aportación por jugador, saldo visible, alta de multas con pago automático e historial.
- `src/styles.css`: presentación de saldos, pagos automáticos y estados parcialmente cubiertos.
- Los datos existentes deberán cargar con saldo cero y sin movimientos de saldo cuando no tengan esta información.
