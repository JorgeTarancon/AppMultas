## Purpose

Permitir registrar movimientos económicos del equipo que no proceden de una multa, manteniendo un saldo explicable y un histórico donde cada ingreso, gasto y pago de multa conserve su importe, descripción y fecha.

## ADDED Requirements

### Requirement: Registrar transacciones independientes
El sistema SHALL permitir crear una transacción manual con tipo ingreso o gasto, importe positivo, descripción obligatoria y fecha, sin exigir que esté asociada a una multa.

#### Scenario: Registrar un gasto del equipo
- **WHEN** el usuario crea una transacción de tipo gasto con importe de 10 euros, descripción "Ronda de bebidas" y una fecha válida
- **THEN** el sistema guarda el movimiento como gasto y reduce el saldo del bote en 10 euros

#### Scenario: Registrar una aportación
- **WHEN** el usuario crea una transacción de tipo ingreso con importe de 5 euros, descripción y una fecha válida
- **THEN** el sistema guarda el movimiento como ingreso y aumenta el saldo del bote en 5 euros

#### Scenario: Datos inválidos
- **WHEN** el importe es vacío, cero, negativo o no numérico, o la descripción está vacía
- **THEN** el sistema rechaza la transacción y conserva intactos los datos existentes

### Requirement: Calcular resumen financiero
El sistema SHALL incluir las transacciones manuales junto con los importes de multas pagadas al calcular ingresos, gastos y saldo del bote.

#### Scenario: Resumen con multas y transacciones
- **WHEN** existen multas pagadas, ingresos manuales y gastos manuales
- **THEN** el resumen muestra los ingresos derivados de multas más ingresos manuales, los gastos manuales y el saldo resultante

#### Scenario: No alterar una multa
- **WHEN** se registra una transacción manual
- **THEN** el importe y el estado de cualquier multa permanecen sin cambios

### Requirement: Histórico trazable
El sistema SHALL mostrar las transacciones manuales junto al histórico de multas, diferenciando su tipo y conservando como mínimo identificador, importe, descripción y fecha de creación.

#### Scenario: Consultar el histórico
- **WHEN** el usuario abre el histórico financiero
- **THEN** puede distinguir cada multa pagada, ingreso manual y gasto manual, junto con su importe y fecha

#### Scenario: Conservar el importe original
- **WHEN** una transacción ya guardada aparece en el histórico o se recarga la aplicación
- **THEN** se muestra el mismo importe registrado originalmente y no se recalcula desde datos actuales

### Requirement: Persistencia y eliminación controlada
El sistema SHALL conservar las transacciones al recargar la aplicación y SHALL requerir una acción explícita para eliminarlas, actualizando el resumen y el histórico después de la eliminación.

#### Scenario: Recargar la aplicación
- **WHEN** el usuario recarga después de registrar una transacción
- **THEN** la transacción, su tipo, fecha, descripción e importe siguen disponibles

#### Scenario: Eliminar una transacción
- **WHEN** el usuario confirma la eliminación de una transacción
- **THEN** el sistema la elimina del histórico y revierte su efecto en el resumen, sin modificar multas ni otras transacciones
