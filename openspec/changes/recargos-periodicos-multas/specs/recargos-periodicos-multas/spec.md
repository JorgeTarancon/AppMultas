# Recargos periódicos de multas

## Requisitos

### Requirement: Configuración del recargo
El sistema SHALL permitir activar o desactivar los recargos y configurar un período entero positivo en días, persistiendo ambos valores.

#### Scenario: Activar y configurar
- **WHEN** el usuario activa el recargo e introduce un período positivo
- **THEN** el sistema valida, guarda la configuración y usa ese período para calcular vencimientos

#### Scenario: Configuración inválida
- **WHEN** el usuario introduce un período vacío, no entero, cero o negativo
- **THEN** el sistema rechaza el valor y conserva la última configuración válida

### Requirement: Elegibilidad de multa pendiente
El sistema SHALL considerar elegible únicamente una multa pendiente cuyo período configurado haya vencido y SHALL calcular la primera fecha desde la fecha base de la multa y las siguientes desde la última aplicación registrada.

#### Scenario: Período vencido
- **WHEN** el recargo está activo, la multa está pendiente y transcurrieron al menos los días configurados desde el hito correspondiente
- **THEN** la multa se marca como elegible para recargo

#### Scenario: No elegible
- **WHEN** el recargo está desactivado, la multa no está pendiente o el período no venció
- **THEN** la multa no se marca ni ofrece aplicación de recargo

### Requirement: Marcado visual y aplicación manual
El sistema SHALL mostrar en rojo las multas pendientes elegibles y SHALL ofrecer un control para aplicar manualmente el recargo configurado, sin aplicarlo durante el renderizado.

#### Scenario: Aplicar recargo
- **WHEN** el usuario confirma la aplicación sobre una multa elegible
- **THEN** el sistema actualiza el importe según la configuración, registra la aplicación con fecha y refresca la vista

#### Scenario: Intento anticipado o duplicado
- **WHEN** se intenta aplicar una multa que ya no es elegible, incluso por un segundo evento con estado obsoleto
- **THEN** el sistema rechaza la operación y no crea un registro adicional

### Requirement: Repetición e historial
El sistema SHALL conservar cada aplicación con su fecha y permitir otra aplicación cuando venza el período siguiente mientras la multa continúe pendiente.

#### Scenario: Nuevo período posterior
- **WHEN** una multa sigue pendiente y transcurre el período configurado desde su última aplicación
- **THEN** vuelve a marcarse como elegible y puede recibir exactamente una nueva aplicación

#### Scenario: Persistencia
- **WHEN** la aplicación se recarga después de configurar o aplicar un recargo
- **THEN** conserva la configuración, el importe y todo el historial de aplicaciones
