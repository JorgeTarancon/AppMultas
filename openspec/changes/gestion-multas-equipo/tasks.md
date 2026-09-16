## 1. Inicialización de la PWA

- [x] 1.1 Crear la aplicación PWA con TypeScript, interfaz responsive, manifest y service worker; verificar que el proyecto compila y puede instalarse desde un navegador compatible.
- [x] 1.2 Configurar IndexedDB y una capa tipada de persistencia para equipo, jugadores, tipos de multa y multas asignadas; verificar que una escritura y lectura sobreviven al cierre y reapertura de la aplicación.
- [x] 1.3 Definir el manejo de importes en unidades enteras de la moneda mínima y fechas de calendario sin hora; verificar con pruebas que no aparecen errores de redondeo ni desplazamientos por zona horaria.

## 2. Equipo, jugadores y catálogo

- [x] 2.1 Implementar la creación y edición del equipo, incluida la opción de recargos y el importe fijo semanal; verificar validaciones de nombre e importe.
- [x] 2.2 Implementar alta, edición, activación y desactivación de jugadores; verificar que un jugador inactivo conserva sus multas y no aparece como opción predeterminada para nuevas asignaciones.
- [x] 2.3 Implementar alta, edición y eliminación de tipos de multa con descripción e importe predeterminado; verificar que se rechazan descripciones vacías e importes no positivos.

## 3. Multas y recargos

- [x] 3.1 Implementar la creación de multas asignadas con jugador, descripción, importe base y fecha, copiando los datos vigentes del catálogo; verificar que una modificación posterior del catálogo no cambia multas existentes.
- [x] 3.2 Implementar el cálculo de semanas completas y recargos fijos solo cuando la opción del equipo esté activa; verificar los casos de cero, una y varias semanas de retraso.
- [x] 3.3 Hacer idempotente el cálculo de recargos y conservar los ya aplicados al desactivar la opción; verificar que abrir o actualizar varias veces no duplica recargos.
- [x] 3.4 Implementar el listado de multas pendientes y pagadas con importe base, recargos, importe actual, fechas y jugador; verificar que los estados se muestran correctamente.

## 4. Pagos, borrado y contabilidad

- [x] 4.1 Implementar el registro de pagos completos con importe final y fecha de pago; verificar que una multa pagada deja de estar pendiente y no admite un segundo pago.
- [x] 4.2 Implementar confirmación contextual y eliminación de multas pendientes o pagadas; verificar que cancelar la confirmación no borra nada.
- [x] 4.3 Implementar totales pendientes y recaudados, y ranking por jugador a partir de multas no eliminadas; verificar que pagar y eliminar una multa actualizan todos los valores relacionados.
- [x] 4.4 Crear la vista principal de resumen con accesos a pendientes, histórico, jugadores, catálogo y configuración; verificar el flujo completo desde crear una multa hasta contabilizar su pago.

## 5. Mensaje para WhatsApp

- [x] 5.1 Implementar el generador de texto agrupado por jugador, ordenado por jugador y fecha, incluyendo fecha, descripción, importe actual, total individual, total pendiente y total recaudado; verificar el contenido con varias multas y jugadores.
- [x] 5.2 Integrar Web Share API y fallback de copiar al portapapeles y abrir WhatsApp con el texto preparado; verificar el comportamiento en un navegador con y sin `navigator.share`.

## 6. PWA offline y validación final

- [ ] 6.1 Configurar caché de recursos y arranque sin conexión después de la primera carga; verificar que se puede consultar y modificar el equipo sin red.
- [ ] 6.2 Añadir pruebas de los escenarios de recargos, pagos, borrado, ranking y mensaje agrupado; verificar que la suite pasa en una ejecución limpia.
- [ ] 6.3 Probar la interfaz en viewport móvil y escritorio, incluyendo instalación y compartir; verificar que no hay desbordamientos y que las acciones destructivas requieren confirmación.