## Context

El repositorio no contiene todavía una aplicación ni especificaciones existentes. El producto se diseñará como una PWA para un único dispositivo administrador, sin cuentas de jugadores, backend ni sincronización remota. La capacidad y sus escenarios están definidos en `specs/gestion-multas-equipo/spec.md`.

## Goals / Non-Goals

**Goals:**

- Ofrecer una interfaz móvil instalable y usable también desde escritorio.
- Mantener todo el estado en el dispositivo y soportar el uso sin conexión después de la primera carga.
- Modelar multas asignadas como registros históricos independientes del catálogo.
- Calcular recargos semanales de forma determinista e idempotente.
- Permitir revisar y compartir rápidamente la deuda agrupada por jugador.

**Non-Goals:**

- Autenticación o perfiles para jugadores.
- Sincronización entre dispositivos o cuentas online.
- Integración autenticada con la API de WhatsApp.
- Pagos parciales, cobros online o conciliación bancaria.
- Gestión de varios equipos en la primera versión.

## Decisions

### PWA local-first

Se implementará como una aplicación web progresiva con TypeScript y una interfaz de componentes, instalable desde el navegador. Se elige frente a aplicaciones nativas separadas porque cubre Android, iOS y escritorio con una sola base de código y encaja con el requisito de un único dispositivo.

### Almacenamiento estructurado local

Los datos se guardarán en IndexedDB mediante una capa tipada de acceso local. Se elige frente a `localStorage` porque permite consultas y actualizaciones estructuradas sin serializar todo el estado en cada operación. La primera versión no dependerá de un servidor.

El modelo mínimo tendrá entidades para configuración del equipo, jugadores, tipos de multa y multas asignadas. Cada multa asignada guardará una instantánea de descripción e importe base; los recargos se representarán de forma auditable por multa o se derivarán de un número de semanas ya aplicado, pero el cálculo debe ser idempotente.

### Recargos por fecha y no por tarea periódica

No se dependerá de un proceso en segundo plano. En cada lectura o mutación de datos se calculará el número de semanas completas transcurridas y se materializarán únicamente los recargos que falten. Esto funciona aunque la aplicación permanezca cerrada y evita duplicados al abrirla varias veces.

Si se desactiva el recargo del equipo, se detienen los recargos futuros y se conservan los ya aplicados. Al reactivarlo, el cálculo continuará desde la última semana ya registrada.

### Borrado explícito y contabilidad derivada

Las eliminaciones exigirán una confirmación contextual con jugador, descripción e importe. La contabilidad y el ranking se calcularán a partir de las multas no eliminadas, de modo que borrar una multa pagada la excluya inmediatamente del total recaudado y del ranking.

### Compartir texto con degradación progresiva

El mensaje se construirá como texto plano determinista, ordenado por nombre de jugador y fecha de multa. Se usará `navigator.share` cuando exista; en otros dispositivos se copiará al portapapeles y se ofrecerá la apertura de WhatsApp mediante un enlace compatible. La aplicación no necesitará credenciales ni permisos de WhatsApp.

### Fechas y dinero

Las fechas se almacenarán con una representación estable y se mostrarán con formato local. El cálculo de vencimientos usará días calendario y semanas completas desde la fecha de la multa. Los importes se manejarán en unidades enteras de la moneda mínima para evitar errores de coma flotante.

## Risks / Trade-offs

- [Riesgo] La pérdida o limpieza del almacenamiento del navegador puede eliminar los datos. -> Mitigación: incluir exportación/importación de copia de seguridad como capacidad posterior y mostrar claramente que la primera versión es local.
- [Riesgo] Las restricciones de compartir de iOS pueden impedir abrir directamente WhatsApp. -> Mitigación: fallback de copiar texto y mostrar una acción alternativa.
- [Riesgo] Cambios de zona horaria pueden alterar la interpretación de una fecha. -> Mitigación: usar fechas de calendario sin hora para multas y documentar el criterio de semanas completas.
- [Riesgo] El borrado de multas pagadas reduce el histórico contable. -> Mitigación: confirmación explícita y actualización inmediata de los totales visibles.