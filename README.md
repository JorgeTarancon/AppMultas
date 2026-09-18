# Cuenta Clara

PWA para gestionar las multas de un equipo de fútbol. Puede funcionar en modo local o con colaboración multiusuario mediante Supabase, PostgreSQL y autenticación por enlace mágico.

## Funcionalidades

- Crear y renombrar el equipo.
- Añadir, activar, desactivar y eliminar jugadores.
- Crear un catálogo de multas con descripción e importe predeterminado.
- Asignar multas a jugadores con una fecha concreta.
- Activar o desactivar los recargos por pago tardío.
- Aplicar un importe fijo por cada semana completa pendiente.
- Registrar únicamente pagos completos.
- Eliminar multas pendientes creadas por error o multas pagadas del histórico, siempre con confirmación.
- Consultar total pendiente, total recaudado y ranking por jugador.
- Generar un mensaje agrupado por jugador para compartirlo por WhatsApp.
- Gestionar equipos con roles `owner`, `editor` y `viewer`.
- Invitar miembros mediante un enlace copiable y aceptar invitaciones desde la aplicación.
- Sincronizar cambios del equipo activo mediante Supabase Realtime.
- Registrar operaciones relevantes en una auditoría visible para el equipo.
- Mantener una caché local por equipo para mejorar la carga inicial.

## Requisitos

- Node.js 18 o superior.
- npm.
- Un navegador moderno con soporte para IndexedDB.

## Instalación y desarrollo

```bash
npm install
npm run dev
```

Vite mostrará una dirección local, normalmente `http://localhost:5173/`.

## Preparar colaboración con Supabase

La colaboración multiusuario requiere Supabase. Si no existen variables de Supabase, la aplicación funciona en modo local con IndexedDB.

1. Copia `.env.example` como `.env`.
2. Sustituye `VITE_SUPABASE_URL` por la URL del proyecto Supabase.
3. Sustituye `VITE_SUPABASE_ANON_KEY` por la clave pública `anon` del proyecto.
4. Ejecuta, en orden, las migraciones `0001` a `0015` de `supabase/migrations/` desde el SQL Editor de Supabase.
5. En Authentication > URL Configuration, añade la URL de desarrollo y la URL de producción como destinos permitidos.
6. Configura el proveedor de email de Supabase para poder enviar enlaces mágicos.
7. Reinicia Vite después de crear o modificar `.env`.

No introduzcas claves `service_role` en `.env` del frontend ni en el código cliente. La clave `anon` está diseñada para usarse junto con las políticas RLS de la base de datos.

La interfaz autenticada usa PostgreSQL como fuente de verdad para la configuración, jugadores, catálogo, multas, recargos, transacciones y movimientos de saldo. Las operaciones principales se ejecutan mediante RPCs atómicas e idempotentes. IndexedDB conserva únicamente una caché por equipo y no se migran los datos locales al backend. No se implementa una cola offline de operaciones: los cambios necesitan conexión con Supabase.

El propietario puede gestionar miembros y sus roles desde la configuración, y eliminar definitivamente sus equipos desde la pantalla de selección. Las invitaciones generan un enlace copiable; la aplicación no envía automáticamente el correo de invitación. La actividad relevante se registra en `audit_log` y se muestra en la sección de auditoría reciente.

Para que el servidor sea accesible desde otros dispositivos de la red:

```bash
npm run dev -- --host 0.0.0.0
```

En equipos Windows donde PowerShell bloquee los shims de npm, prueba:

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

## Compilación y previsualización

```bash
npm run build
npm run preview
```

La compilación genera `dist/`, que puede publicarse en cualquier hosting estático. El proyecto usa rutas relativas en Vite para facilitar su publicación en GitHub Pages u otro subdirectorio.

### Directivas de grupo de Windows

El proyecto depende de Vite y `esbuild` para compilar TypeScript. En algunos equipos corporativos una directiva de grupo puede bloquear `esbuild.exe` y producir un error `spawn UNKNOWN`. En ese caso, la aplicación no podrá iniciarse localmente con Vite hasta que el administrador permita el ejecutable o se use otro entorno de desarrollo.

La extensión Live Preview de VS Code sirve archivos estáticos, pero no transpila `src/main.ts`; por tanto, no puede previsualizar esta aplicación directamente sin una compilación previa.

## Uso básico

1. Abre la aplicación y entra en **Jugadores** para crear la plantilla.
2. En **Equipo y recargos**, define el nombre del equipo y decide si se aplican recargos semanales.
3. Añade reglas habituales en el catálogo de multas.
4. En **Multas**, crea una multa indicando jugador, descripción, importe y fecha.
5. Marca la multa como pagada cuando se cobre el importe completo.
6. Usa **Compartir** para generar el mensaje agrupado por jugador.

Para trabajar con un equipo compartido, solicita un enlace mágico de acceso, crea o selecciona un equipo y usa **Configuración** para invitar miembros. Los lectores pueden consultar los datos, mientras que los editores pueden realizar operaciones de gestión; el propietario administra miembros y roles.

El importe de una multa pagada queda fijado en el momento del pago. Cambiar posteriormente el recargo semanal no modifica el histórico.

## Datos y privacidad

En modo colaborativo, los datos del equipo se almacenan en PostgreSQL mediante Supabase y están protegidos por políticas RLS. La aplicación cliente solo usa la clave pública `anon`; nunca debe incluir una clave `service_role`. La caché IndexedDB se guarda por equipo en el navegador y no sustituye al backend.

En modo local, los datos se guardan en IndexedDB del navegador. Borrar los datos del navegador puede eliminar esa información local. No existe migración automática de los datos locales al backend.

El botón de WhatsApp utiliza la función nativa de compartir cuando está disponible. Si no lo está, copia el mensaje y abre una alternativa web.

## Arquitectura

```text
src/main.ts              Interfaz, autenticación, equipos y eventos
src/domain.ts            Modelo, recargos, contabilidad y mensaje de WhatsApp
src/collaboration.ts     Equipos, miembros, invitaciones, auditoría y Realtime
src/remoteRepository.ts  Lectura y mutaciones PostgreSQL mediante Supabase
src/storage.ts           Caché local por equipo y modo IndexedDB
src/supabase.ts          Cliente Supabase y sesión de autenticación
src/styles.css           Diseño responsive
supabase/migrations/     Esquema, RLS, RPCs, auditoría e invitaciones
public/sw.js             Caché básica de la PWA
```

## Verificación

Comprobar tipos sin iniciar el bundler:

```bash
npx tsc --noEmit
```

La validación actual incluye comprobación de tipos y del formato del diff. La prueba final de colaboración debe realizarse con dos cuentas reales en Supabase, verificando roles, sincronización, invitaciones y auditoría.

## Estado del proyecto

La gestión multiusuario está implementada con PostgreSQL como fuente de verdad, roles, invitaciones por enlace, sincronización Realtime y auditoría. La cola offline de operaciones, el envío automático de invitaciones por email y la exportación/importación de copias de seguridad quedan fuera del alcance actual.
