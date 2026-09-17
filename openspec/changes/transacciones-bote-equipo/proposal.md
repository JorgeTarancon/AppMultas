# Why

La aplicación solo refleja movimientos económicos derivados de multas pagadas. No permite registrar gastos del equipo ni aportaciones voluntarias, por lo que el saldo real del bote no coincide con la actividad financiera y cualquier ajuste manual queda sin explicación.

# What Changes

- Añadir transacciones independientes de las multas para registrar ingresos voluntarios y gastos del equipo.
- Permitir informar importe, descripción y fecha de cada movimiento.
- Incorporar las transacciones al saldo y a los totales financieros con el signo correspondiente: los ingresos aumentan el bote y los gastos lo reducen.
- Mostrar las transacciones junto al histórico de multas, diferenciando su tipo y conservando su importe original.
- Persistir cada movimiento con un identificador y su fecha de creación, sin recalcular ni sobrescribir importes históricos.
- Mantener las multas como registros trazables independientes; una transacción manual no modifica una multa ni se convierte en pago de una multa.

# Capabilities

## New Capabilities
- `transacciones-bote`: registrar, consultar y eliminar movimientos manuales de ingreso o gasto, incorporándolos al saldo y al histórico auditable.

## Modified Capabilities
- `gestion-multas-equipo`: ampliar el resumen financiero y el histórico para incluir transacciones independientes sin perder la trazabilidad de las multas.

# Impact

- `src/domain.ts`: nuevos tipos, validación de transacciones y cálculo de ingresos, gastos y saldo.
- `src/storage.ts`: persistencia y normalización de transacciones junto con los datos locales existentes.
- `src/main.ts`: formulario de alta, listado histórico y actualización del resumen financiero.
- `src/styles.css`: presentación diferenciada para ingresos, gastos y estados del histórico.
- La estructura persistida actual deberá seguir cargando correctamente, inicializando una colección vacía de transacciones cuando no exista.
