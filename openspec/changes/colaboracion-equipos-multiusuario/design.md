# Diseño técnico

## Resumen

La aplicación evolucionará de una PWA únicamente local a una aplicación local-first con un backend gestionado. Supabase es la opción propuesta porque proporciona autenticación por enlace mágico, PostgreSQL, políticas de acceso por fila y suscripciones en tiempo real sin operar un servidor propio.

## Identidad y equipos

- Supabase Auth gestionará cuentas y sesiones mediante magic link.
- `teams` representará cada equipo compartido.
- `team_members` relacionará usuarios y equipos con `owner`, `editor` o `viewer`.
- Las invitaciones tendrán token aleatorio, equipo, email objetivo, rol, fecha de expiración, uso y usuario que invita.
- Las políticas RLS comprobarán la membresía antes de permitir leer o modificar cualquier fila del equipo.
- Los jugadores no tendrán identidad de usuario; serán entidades pertenecientes a un equipo.

## Modelo de datos remoto

Tablas principales:

- `teams`: identidad y configuración del equipo.
- `team_members`: usuario, equipo, rol y fechas de alta.
- `team_invitations`: invitaciones pendientes y consumidas.
- `players`: jugadores del equipo.
- `fine_types`: catálogo del equipo.
- `fines`: multas, estado, importe pagado, autor y metadatos de actualización.
- `surcharge_applications`: recargos asociados a una multa.
- `transactions`: ingresos y gastos manuales.
- `balance_movements`: depósitos y consumos con referencias a jugador y multa.
- `audit_log`: acción, usuario, entidad, identificador, fecha y metadatos mínimos.

Todos los importes serán enteros en céntimos. Las fechas efectivas y marcas de creación se almacenarán por separado cuando el dominio lo requiera.

## Operaciones atómicas

Las operaciones contables no se resolverán combinando varias escrituras independientes desde el navegador. Se implementarán como funciones RPC o transacciones PostgreSQL:

1. Validar membresía y rol.
2. Bloquear las filas relevantes del jugador, multa o movimiento mediante la transacción.
3. Comprobar una clave de idempotencia del comando.
4. Crear o actualizar la multa y sus movimientos relacionados.
5. Insertar el registro de auditoría.
6. Confirmar todo o revertir todo.

Las eliminaciones y cambios sensibles también comprobarán permisos en RLS y en la función de dominio del servidor.

## Sincronización y caché local

- La fuente de verdad será PostgreSQL.
- El cliente cargará el snapshot inicial y lo conservará en IndexedDB por equipo.
- Las suscripciones Realtime recibirán inserciones, actualizaciones y eliminaciones filtradas por equipo.
- Los cambios locales se representarán como comandos pendientes con identificador único, estado y reintentos.
- La interfaz distinguirá `sincronizado`, `pendiente`, `sin conexión` y `error`.
- La vista aplicará eventos remotos de forma idempotente para no duplicar registros.
- La edición simultánea de un mismo registro se resolverá en servidor; las operaciones financieras no usarán una estrategia ciega de último escritor.

El modo offline de esta primera fase se limita a conservar la última copia, permitir consulta y encolar únicamente operaciones explícitamente soportadas. No se asumirá que una operación financiera está confirmada hasta sincronizarla.

## Migración desde IndexedDB

- Detectar si existe un `AppData` local.
- Ofrecer migración al usuario autenticado que cree el primer equipo.
- Generar identificadores estables para conservar referencias entre multas, recargos y movimientos.
- Subir por lotes con claves de idempotencia.
- Validar conteos y referencias antes de marcar la migración como completa.
- Mantener el JSON local y ofrecer exportación como respaldo.

## Interfaz

Se añadirán:

- Pantalla de acceso por email y resultado del envío del enlace.
- Selector de equipo y creación de equipo.
- Gestión de miembros, invitaciones y roles para propietarios.
- Indicador de sincronización y conexión.
- Identidad del usuario en acciones auditables.
- Estados de carga, error, reintento y conflicto.

Las vistas actuales de multas, jugadores, transacciones y saldos conservarán el dominio de negocio existente, pero sus operaciones escribirán mediante la capa remota y no directamente sobre un documento completo en IndexedDB.

## Seguridad y privacidad

- Las credenciales y tokens serán gestionados por Supabase Auth.
- No se confiará en ocultar botones para garantizar permisos.
- RLS aislará cada equipo.
- Los tokens de invitación serán de un solo uso y caducables.
- No se registrarán datos sensibles innecesarios en la auditoría.
- Las claves públicas del cliente no concederán acceso fuera de las políticas configuradas.

## Despliegue y configuración

- Añadir variables públicas de URL y clave anónima del proyecto Supabase.
- Crear migraciones SQL versionadas para tablas, índices, RLS, funciones y canales Realtime.
- Documentar configuración del proveedor de email y dominios permitidos.
- Mantener la aplicación desplegable como frontend estático.
