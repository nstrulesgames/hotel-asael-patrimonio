# Migración de Hotel ASAEL a Supabase

Este directorio prepara la migración desde Cloudflare D1/R2 hacia PostgreSQL y Storage de Supabase. La aplicación publicada continúa usando D1/R2 hasta completar y validar el cambio de origen de datos.

## Archivos

- `drizzle/`: salida reproducible generada desde `db/schema.supabase.ts`.
- `migrations/202608250000_initial_schema.sql`: las 44 tablas y sus índices.
- `migrations/202608250001_security_and_integrity.sql`: relaciones, validaciones, RLS, datos mínimos y bucket privado.

## Seguridad

Las tablas tienen RLS habilitado y `anon`/`authenticated` no reciben acceso directo. Las rutas del servidor conservan la autorización por correo y rol y se conectarán con `SUPABASE_SECRET_KEY`, que nunca debe exponerse al navegador ni guardarse en Git.

El bucket `hotel-asael-evidencias` es privado, admite JPEG, PNG, WebP y PDF, y limita cada archivo a 20 MB.

## Orden de migración

1. Generar y revisar las migraciones localmente con `npm run db:generate:supabase`.
2. Aplicar primero el esquema y después seguridad/integridad al proyecto de desarrollo.
3. Exportar D1 y transformar booleanos `0/1` a `false/true`.
4. Importar respetando las relaciones y reajustar las secuencias PostgreSQL.
5. Cambiar los endpoints por grupos: usuarios, hotel, documentos, POS y patrimonio.
6. Ejecutar pruebas de rol, datos y archivos antes del corte definitivo.

No se cargan propiedades, huéspedes, ventas ni habitaciones de demostración. Solo se crean las ubicaciones de almacén y la distribución patrimonial inicial aprobada.