## Purpose

Permitir que cada jugador disponga de un saldo aportado previamente, visible y trazable, que se incorpore al bote desde el momento de la aportación y se consuma automáticamente al registrar sus multas.

## ADDED Requirements

### Requirement: Saldo individual visible
El sistema SHALL mantener un saldo independiente para cada jugador, inicializado en cero cuando no existan aportaciones, y SHALL mostrarlo junto al jugador.

#### Scenario: Jugador sin saldo
- **WHEN** un jugador no tiene aportaciones de saldo registradas
- **THEN** se muestra un saldo disponible de 0 euros

#### Scenario: Jugador con saldo
- **WHEN** un jugador realiza una o más aportaciones y no las ha consumido completamente
- **THEN** se muestra el saldo restante acumulado junto a su ficha o fila

### Requirement: Precargar saldo de un jugador
El sistema SHALL permitir registrar una aportación positiva para un jugador con importe, descripción y fecha, y SHALL aumentar su saldo inmediatamente.

#### Scenario: Registrar una precarga
- **WHEN** el usuario registra una aportación de 5 euros para Jorge
- **THEN** el saldo disponible de Jorge aumenta en 5 euros y la aportación queda trazada con importe, fecha y descripción

#### Scenario: Aportación inválida
- **WHEN** el importe es vacío, cero, negativo o no numérico, o falta el jugador, la descripción o la fecha
- **THEN** el sistema rechaza la operación y no cambia el saldo ni el bote

### Requirement: Incorporar precargas al bote
El sistema SHALL incluir las aportaciones de saldo en los ingresos y en el saldo del bote desde el momento en que se registran, aunque todavía no se haya creado una multa.

#### Scenario: Bote tras precarga
- **WHEN** se registra una precarga de 5 euros y no existe ningún consumo
- **THEN** el total de ingresos y el saldo del bote aumentan en 5 euros

#### Scenario: Consumo posterior
- **WHEN** una precarga ya contabilizada se usa para pagar una multa
- **THEN** el bote no vuelve a aumentar ni disminuir por la transferencia interna entre saldo del jugador y multa, y la aportación original permanece en el histórico

### Requirement: Aplicar saldo automáticamente a una multa
El sistema SHALL aplicar automáticamente el saldo disponible del jugador al registrar una multa, SHALL descontar el importe consumido y SHALL marcar la multa como pagada cuando el saldo cubra el importe completo.

#### Scenario: Sin saldo
- **WHEN** Jorge tiene saldo 0 y se registra una multa de 2 euros
- **THEN** no se consume saldo y la multa queda pendiente de pago por 2 euros

#### Scenario: Saldo exacto
- **WHEN** Jorge tiene saldo 2 y se registra una multa de 2 euros
- **THEN** se consumen 2 euros, el saldo queda en 0 y la multa queda pagada automáticamente

#### Scenario: Saldo insuficiente
- **WHEN** Jorge tiene saldo 1 y se registra una multa de 2 euros
- **THEN** se consume 1 euro, el saldo queda en 0 y la multa queda pendiente por el 1 euro restante

#### Scenario: Saldo superior
- **WHEN** Jorge tiene saldo 4 y se registra una multa de 2 euros
- **THEN** se consumen 2 euros, la multa queda pagada automáticamente y Jorge conserva 2 euros de saldo

### Requirement: Trazabilidad de saldo y pagos
El sistema SHALL conservar el historial de cada aportación y de cada consumo asociado a una multa, incluyendo jugador, importe, fecha y referencia al movimiento o multa relacionada.

#### Scenario: Consultar consumo automático
- **WHEN** una multa consume saldo de su jugador
- **THEN** el histórico permite distinguir la aportación original, el importe consumido y la multa que recibió el consumo

#### Scenario: Recargar la aplicación
- **WHEN** se recarga la aplicación después de una precarga o consumo
- **THEN** se conserva el saldo restante, el estado de la multa y todo el historial de movimientos

### Requirement: No duplicar pagos
El sistema SHALL aplicar el saldo una sola vez al registrar una multa y SHALL evitar que volver a renderizar, recargar o editar configuración consuma saldo adicional.

#### Scenario: Renderizado repetido
- **WHEN** una multa ya fue creada y pagada total o parcialmente con saldo y la vista se renderiza de nuevo
- **THEN** el saldo y el historial permanecen sin cambios
