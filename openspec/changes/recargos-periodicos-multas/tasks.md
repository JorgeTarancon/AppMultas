# Tareas

- [x] Revisar y extender los tipos del dominio para configuración, historial y cálculo de elegibilidad de recargos.
- [x] Implementar lectura/escritura versionada de configuración e historial en `src/storage.ts`, con defaults y tolerancia a datos inválidos.
- [x] Implementar el cálculo de días vencidos, siguiente fecha elegible y aplicación idempotente en la lógica de dominio.
- [x] Añadir al formulario de `src/main.ts` el interruptor de activación y el período entero en días, con validación y persistencia.
- [x] Añadir a la lista de multas el indicador rojo de vencimiento y el botón de aplicación manual.
- [x] Registrar fecha, importe aplicado y resultado en cada aplicación; refrescar la vista sin aplicar automáticamente.
- [x] Añadir estilos accesibles para el estado rojo, controles y estados deshabilitados en `src/styles.css`.
- [ ] Cubrir con pruebas los casos de configuración, primera aplicación, períodos posteriores, multas no pendientes, fechas, persistencia y doble clic.
- [ ] Ejecutar validación, pruebas y comprobación de que el recargo desactivado conserva el flujo existente.
