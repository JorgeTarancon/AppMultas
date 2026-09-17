# Tareas de implementación

## 1. Dominio y persistencia

- [x] 1.1 Añadir tipos de movimientos de saldo y extender `AppData` con su colección persistida.
- [x] 1.2 Implementar validación de depósitos y cálculo de saldo disponible por jugador.
- [x] 1.3 Implementar la creación de multas con consumo atómico de saldo, pago completo o importe pendiente restante.
- [x] 1.4 Registrar consumos con referencia a multa y evitar consumos duplicados al repetir eventos o cargar la aplicación.
- [x] 1.5 Normalizar movimientos de saldo antiguos o inválidos y conservar compatibilidad con datos existentes.
- [x] 1.6 Integrar depósitos en los ingresos del bote sin contabilizar consumos como nuevos ingresos o gastos.

## 2. Interfaz

- [x] 2.1 Mostrar el saldo disponible junto a cada jugador, usando cero cuando no haya depósitos.
- [x] 2.2 Añadir formulario para precargar saldo con jugador, importe, descripción y fecha.
- [x] 2.3 Mostrar el resultado del consumo automático al registrar una multa y conservar el flujo de pago manual para importes pendientes.
- [x] 2.4 Añadir al histórico los depósitos y consumos con fecha, importe, jugador y referencia a la multa.
- [x] 2.5 Añadir estilos accesibles para saldos, estados pagados parcialmente y movimientos de crédito.

## 3. Verificación

- [ ] 3.1 Cubrir saldo cero, exacto, insuficiente y superior, incluyendo saldo restante y estado final de la multa.
- [ ] 3.2 Verificar varias precargas, varias multas, persistencia, resumen del bote y ausencia de doble consumo.
- [ ] 3.3 Ejecutar compilación, pruebas y comprobación manual del flujo completo de precarga, multa e histórico.