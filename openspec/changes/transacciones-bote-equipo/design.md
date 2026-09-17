# Diseño técnico

## Modelo de datos

Añadir una entidad `Transaction` independiente de `Fine` con:

- `id`: identificador estable.
- `type`: `income` o `expense`.
- `amountCents`: entero positivo, conservado como importe original.
- `description`: concepto introducido por el usuario.
- `date`: fecha efectiva del movimiento.
- `createdAt`: fecha y hora ISO de creación para trazabilidad.

La aplicación seguirá conservando las multas y sus pagos como entidades separadas. Las transacciones manuales no deben reutilizar `Fine` ni cambiar el estado de una multa.

## Cálculo financiero

El dominio expondrá un resumen que diferencie:

- ingresos por multas pagadas;
- ingresos manuales;
- gastos manuales;
- saldo neto: ingresos por multas + ingresos manuales - gastos manuales.

El cálculo usará los importes persistidos, sin depender de la configuración vigente de recargos ni recalcular transacciones antiguas.

## Persistencia y compatibilidad

Extender `AppData` con una colección `transactions`. Al cargar datos existentes sin esa propiedad, usar una colección vacía. Normalizar registros desconocidos o inválidos sin impedir la carga del resto de la aplicación. Guardar los cambios en el mismo almacenamiento local que multas, jugadores y configuración.

## Interfaz

Añadir un formulario accesible desde el resumen o el histórico para elegir tipo, importe, descripción y fecha. Validar el importe como positivo y la descripción como no vacía antes de guardar.

Mostrar movimientos manuales en el histórico financiero junto con multas pagadas, con una etiqueta clara para ingreso o gasto, importe con signo contable y fecha. Ofrecer eliminación mediante confirmación explícita y refrescar el resumen después de crear o eliminar.

El resumen principal debe dejar de presentar el total recaudado como si solo fueran multas: debe distinguir recaudación, aportaciones, gastos y saldo disponible. Mantener el histórico de multas existente.

## Consistencia

Crear y eliminar transacciones debe ser una operación explícita del usuario. No generar movimientos automáticamente durante el renderizado, al recargar ni al cambiar la configuración de recargos. La eliminación solo debe afectar a la transacción seleccionada.

## Pruebas

Cubrir validación, ingresos, gastos, saldo combinado con multas pagadas, independencia respecto de multas, persistencia, normalización de datos antiguos, conservación del importe original y eliminación confirmada.