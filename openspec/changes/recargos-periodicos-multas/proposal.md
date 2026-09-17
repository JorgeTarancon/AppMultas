# Propuesta: recargos periódicos de multas

## Resumen
Añadir un recargo opcional y configurable para multas pendientes, con aplicación manual, trazabilidad y posibilidad de repetirlo por períodos vencidos.

## Motivación
La aplicación actual gestiona multas y su estado en el dominio, almacenamiento local y una vista única, pero no ofrece un ciclo explícito para avisar, aplicar ni auditar recargos por mora. El recargo debe permanecer bajo control del usuario y no aplicarse automáticamente.

## Alcance
- Activar o desactivar el recargo.
- Configurar el período en días.
- Identificar visualmente en rojo las multas pendientes cuyo siguiente período haya vencido.
- Permitir aplicar manualmente el recargo configurado desde la interfaz.
- Registrar la fecha de cada aplicación y conservar el historial.
- Permitir nuevas aplicaciones al vencer cada período posterior mientras la multa siga pendiente.

## Fuera de alcance
- Cobro automático, pagos en línea o notificaciones externas.
- Cambios en multas pagadas o canceladas.
- Migración de datos fuera del almacenamiento local existente.

## Criterios de aceptación
1. El usuario puede activar/desactivar el recargo y definir un período entero positivo en días.
2. Solo multas pendientes con un período vencido aparecen marcadas en rojo.
3. La aplicación del recargo requiere una acción manual y actualiza el importe de la multa.
4. Cada aplicación conserva su fecha y se puede distinguir del estado actual.
5. Tras aplicar un recargo, el siguiente vencimiento se calcula desde esa aplicación; mientras siga pendiente, el flujo puede repetirse por cada período vencido.
6. La configuración y el historial sobreviven al recargar la aplicación.
