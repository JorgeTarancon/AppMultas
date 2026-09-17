# Propuesta: colaboración multiusuario por equipos

## Why

La aplicación guarda actualmente todo en IndexedDB del navegador y solo permite gestionar un equipo desde un dispositivo. Para que varias personas puedan registrar multas sobre el mismo equipo se necesita identidad de usuario, almacenamiento compartido y sincronización entre dispositivos.

## What Changes

- Añadir cuentas individuales con acceso mediante enlace mágico enviado por email.
- Permitir crear equipos y asociar usuarios mediante membresías e invitaciones.
- Introducir roles de propietario, editor y consulta.
- Persistir los datos compartidos en un backend centralizado con PostgreSQL.
- Sincronizar cambios casi en tiempo real entre dispositivos.
- Mantener una caché local para tolerar cortes breves de conexión.
- Registrar el usuario responsable de las acciones relevantes.
- Ejecutar de forma atómica las operaciones que afectan a saldos y pagos.
- Migrar los datos existentes de IndexedDB al equipo inicial del propietario.
- Mantener exportación y recuperación de datos como capacidad de respaldo.

## Capabilities

### New Capabilities

- `autenticacion-usuarios`: acceso individual mediante enlace mágico y gestión de sesión.
- `equipos-colaborativos`: creación de equipos, membresías, invitaciones y roles.
- `sincronizacion-equipos`: persistencia remota, caché local y actualizaciones casi en tiempo real.
- `auditoria-acciones-equipo`: trazabilidad del usuario que realiza acciones relevantes.

### Modified Capabilities

- `gestion-multas-equipo`: asociar multas y pagos a un equipo y a un usuario responsable.
- `saldo-precargado-jugadores`: mantener consumos atómicos y consistentes cuando colaboran varios usuarios.
- `transacciones-bote-equipo`: asociar transacciones a equipo y usuario sin duplicar movimientos.

## Impact

- `src/domain.ts`: extender entidades con equipo, usuario responsable y metadatos de auditoría.
- `src/storage.ts`: sustituir o complementar IndexedDB con una capa remota y caché local.
- `src/main.ts`: añadir sesión, selector de equipo, invitaciones, miembros y estado de sincronización.
- Backend gestionado: autenticación, tablas relacionales, políticas de acceso, funciones atómicas y suscripciones en tiempo real.
- Migración de datos locales existentes.
- Nuevas variables de configuración para el proveedor remoto.
- Los jugadores no tendrán cuentas; solo las personas que gestionan equipos serán usuarios autenticados.
- No se implementará P2P/CRDT en esta fase.
