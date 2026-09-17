# Diseño técnico

## Modelo de saldo

Añadir un libro de movimientos de saldo por jugador, separado de las transacciones generales del bote:

- `id`: identificador del movimiento.
- `playerId`: jugador afectado.
- `type`: `deposit` o `consumption`.
- `amountCents`: importe positivo del movimiento.
- `description`: concepto legible.
- `date` y `createdAt`: fechas efectiva y de creación.
- `fineId` opcional: referencia a la multa cuando el movimiento es un consumo.

El saldo disponible se derivará como depósitos menos consumos, evitando almacenar un valor mutable que pueda quedar desincronizado. Los jugadores existentes tendrán saldo cero si no hay movimientos.

## Alta de multas y consumo atómico

Crear una multa debe ser una operación de dominio que:

1. calcule el importe inicial de la multa;
2. obtenga el saldo disponible del jugador;
3. consuma `min(saldo, importe)` una sola vez;
4. registre el consumo con referencia a la multa;
5. marque la multa como `paid` si el consumo cubre el importe completo, o `pending` con el importe restante si no lo cubre.

La multa conservará el importe base y el importe final/pagado según los contratos actuales. El consumo se realizará solo durante la creación explícita de la multa, nunca durante renderizado, carga o persistencia.

## Contabilidad del bote

Las aportaciones de saldo se contabilizarán como ingresos manuales del bote desde su fecha de creación. Los consumos de saldo no serán otro ingreso ni gasto: son una asignación interna de dinero ya ingresado. El resumen debe poder distinguir aportaciones de saldo de otras transacciones manuales y mantener el saldo neto correcto.

## Persistencia y compatibilidad

Extender `AppData` con `balanceMovements` o una colección equivalente. Al cargar datos antiguos, usar una colección vacía. Normalizar tipos, importes, jugadores, fechas y referencias inválidas sin bloquear el resto de datos. Mantener las transacciones generales existentes y no convertirlas automáticamente en saldos de jugadores salvo que tengan una referencia explícita al jugador.

## Interfaz

En la vista de jugadores, mostrar el saldo disponible de cada jugador y una acción para añadir saldo. El formulario solicitará importe, descripción y fecha, validará valores positivos y guardará un depósito trazable.

En el formulario de nueva multa, el usuario no tendrá que activar manualmente el uso del saldo: el sistema lo aplicará automáticamente al guardar. La confirmación o mensaje de resultado debe indicar si se pagó completa con saldo, si quedó una parte pendiente o si no había saldo.

En el histórico, mostrar depósitos y consumos con sus referencias. Diferenciar pagos automáticos de pagos manuales y evitar que la misma multa consuma dos veces.

## Pruebas

Cubrir saldo cero, saldo exacto, saldo insuficiente, saldo superior, varias precargas, varias multas, pago manual de restos, persistencia, cálculo del bote y ausencia de consumo durante renderizado o recarga.