# Tareas de implementación

## 1. Dominio y persistencia

- [x] 1.1 Añadir el tipo de transacción (`income`/`expense`) y extender `AppData` con la colección persistida.
- [x] 1.2 Implementar validación de importe, descripción, tipo y fecha para nuevas transacciones.
- [x] 1.3 Implementar el resumen financiero con ingresos por multas, ingresos manuales, gastos y saldo neto.
- [x] 1.4 Normalizar transacciones al cargar datos existentes, ignorar registros inválidos y conservar compatibilidad cuando no exista la colección.

## 2. Interfaz de movimientos

- [x] 2.1 Añadir el formulario para crear ingresos y gastos con importe, descripción y fecha.
- [x] 2.2 Mostrar en el histórico las multas pagadas y las transacciones manuales, diferenciando tipo, signo, fecha y concepto.
- [x] 2.3 Añadir eliminación confirmada de transacciones sin afectar multas ni movimientos restantes.
- [x] 2.4 Actualizar el resumen visual para distinguir recaudación de multas, aportaciones, gastos y saldo disponible.
- [x] 2.5 Añadir estilos responsive y estados accesibles para ingresos, gastos, validación y confirmación.

## 3. Verificación

- [ ] 3.1 Cubrir con pruebas la validación, creación de ingresos y gastos, cálculo del saldo combinado y la independencia respecto de multas.
- [ ] 3.2 Verificar persistencia, normalización de datos antiguos, conservación del importe original y eliminación explícita.
- [ ] 3.3 Ejecutar compilación, pruebas y comprobación manual del flujo de alta, histórico y saldo.