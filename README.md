# Cuenta Clara

PWA local para gestionar las multas de un equipo de fútbol desde un único dispositivo. Los jugadores no necesitan cuentas ni iniciar sesión.

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
- Continuar usando los datos sin conexión después de la primera carga.

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

La base de colaboración está preparada, pero es opt-in: si no existen variables de Supabase, la aplicación continúa usando el almacenamiento local actual.

1. Copia `.env.example` como `.env`.
2. Sustituye `VITE_SUPABASE_URL` por la URL del proyecto Supabase.
3. Sustituye `VITE_SUPABASE_ANON_KEY` por la clave pública `anon` del proyecto.
4. Ejecuta `supabase/migrations/0001_collaboration_foundation.sql`, `0002_allow_team_creation.sql`, `0003_fix_create_team_rpc.sql`, `0004_atomic_finance_operations.sql`, `0005_member_invitations.sql`, `0006_atomic_balance_transactions.sql`, `0007_fix_member_invitation_rpc.sql` y `0008_enable_pgcrypto_for_invitations.sql` desde el SQL Editor de Supabase.
5. En Authentication > URL Configuration, añade la URL de desarrollo y la URL de producción como destinos permitidos.
6. Configura el proveedor de email de Supabase para poder enviar enlaces mágicos.
7. Reinicia Vite después de crear o modificar `.env`.

No introduzcas claves `service_role` en `.env` del frontend ni en el código cliente. La clave `anon` está diseñada para usarse junto con las políticas RLS de la base de datos.

La interfaz autenticada usa PostgreSQL como fuente de verdad para la configuración, jugadores, catálogo, multas, recargos, transacciones y movimientos de saldo. IndexedDB solo se utiliza cuando Supabase no está configurado; no se migran los datos locales al backend. Los cambios del equipo activo se recargan mediante Realtime.

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

El importe de una multa pagada queda fijado en el momento del pago. Cambiar posteriormente el recargo semanal no modifica el histórico.

## Datos y privacidad

Los datos se guardan únicamente en IndexedDB del navegador del dispositivo. No hay backend, cuentas, sincronización ni envío automático de información a un servidor.

Esto implica que borrar los datos del navegador o cambiar de dispositivo puede hacer que se pierda la información. La exportación e importación de copias de seguridad queda como mejora futura.

El botón de WhatsApp utiliza la función nativa de compartir cuando está disponible. Si no lo está, copia el mensaje y abre una alternativa web.

## Arquitectura

```text
src/main.ts      Interfaz y eventos de la aplicación
src/domain.ts    Modelo, recargos, contabilidad y mensaje de WhatsApp
src/storage.ts   Persistencia local con IndexedDB
src/styles.css   Diseño responsive
public/sw.js     Caché básica para uso offline
```

## Verificación

Comprobar tipos sin iniciar el bundler:

```bash
npx tsc --noEmit
```

La suite de pruebas automatizadas y la validación visual multidispositivo están previstas como próximos pasos.

## Estado del proyecto

Versión inicial en desarrollo. La gestión principal está implementada, pero todavía no se incluye exportación/importación de copias de seguridad ni sincronización entre dispositivos.
