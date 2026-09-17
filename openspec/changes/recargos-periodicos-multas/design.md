# Diseño: recargos periódicos de multas

## Contexto técnico
El dominio TypeScript (`src/domain.ts`) modela las multas y sus estados; `src/storage.ts` persiste el estado en almacenamiento local; `src/main.ts` construye la vista y maneja eventos; `src/styles.css` contiene la presentación. El cambio debe extender esos límites sin alterar contratos de multas que no necesiten recargos.

## Modelo propuesto
- `RecargoConfig`: `enabled: boolean`, `periodDays: number` y, si el producto ya dispone de un porcentaje/importe de recargo, reutilizarlo explícitamente; no inferirlo de la fecha.
- `RecargoAplicado`: identificador de multa, fecha ISO de aplicación y valor aplicado (o importe resultante), para que el historial sea auditable aunque cambie la configuración.
- Persistir configuración e historial bajo claves/versiones nuevas y tolerar datos ausentes mediante valores por defecto.
- Derivar el vencimiento: usar la fecha base de la multa para la primera aplicación y la fecha del último recargo para las siguientes. Una multa es elegible cuando está pendiente, el recargo está activo y han transcurrido al menos `periodDays` días desde ese hito.

## Flujo de interfaz
1. Añadir controles de configuración con interruptor de activación y período en días, validando entero positivo.
2. En cada fila pendiente, mostrar en rojo una indicación de período vencido cuando sea elegible.
3. Mostrar un botón de aplicación manual únicamente cuando la multa sea elegible; confirmar la acción, actualizar el importe y registrar la fecha actual.
4. Después de aplicar, refrescar el cálculo y deshabilitar la acción hasta el siguiente vencimiento.
5. No aplicar recargos durante el renderizado ni por un temporizador; toda aplicación parte de un evento explícito del usuario.

## Consistencia y fechas
- Comparar fechas en formato ISO y calcular días transcurridos de forma determinista.
- Guardar fechas completas en UTC; presentar la fecha según las convenciones existentes de la aplicación.
- Evitar doble aplicación: volver a evaluar elegibilidad con el estado persistido al recibir el evento y rechazar una aplicación si el período aún no venció.

## Errores y compatibilidad
- Rechazar períodos vacíos, no numéricos, cero o negativos y conservar la configuración anterior válida.
- Ignorar o reparar historiales malformados sin bloquear la carga.
- Mantener el comportamiento actual cuando el recargo esté desactivado.

## Pruebas
Cubrir configuración, elegibilidad inicial y posterior, estados no pendientes, persistencia, validación, aplicación manual, importe, historial y prevención de doble aplicación. Verificar también el marcado visual y el flujo de recarga.
