# Hotel ASAEL · Gestión interna

Aplicación privada para gestionar habitaciones, huéspedes, estadías, contratos, evidencias, tareas operativas, mini POS, almacén y Patrimonio Base.

## Arquitectura de la rama Vercel

- Next.js nativo sobre Vercel.
- Supabase Auth mediante enlace de acceso enviado al correo autorizado.
- PostgreSQL de Supabase como base de datos del servidor.
- Supabase Storage privado para contratos, actas, fotografías y comprobantes.
- Autorización funcional mediante los roles `PROPIETARIO`, `ADMINISTRADOR` y `RECEPCION` almacenados en `public.users`.
- Patrimonio Base visible exclusivamente para propietarios y administradores.

La publicación anterior de Sites permanece separada en `main`. La migración se desarrolla en `codex/vercel-migration` hasta completar las pruebas de integración.

## Desarrollo

Requiere Node.js 22.13 o superior.

```bash
npm install
npm run dev
npm test
```

Copia `.env.example` como `.env.local` y configura las variables fuera de Git. No guardes claves privadas en el repositorio.

## Variables

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública del proyecto.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave publicable para Supabase Auth.
- `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY`: clave privada usada solo por rutas del servidor y Storage.
- `SUPABASE_DATABASE_URL`, `POSTGRES_URL` o `POSTGRES_PRISMA_URL`: conexión al pooler PostgreSQL de Supabase.
- `SUPABASE_STORAGE_BUCKET`: opcional; por defecto `hotel-asael-evidencias`.

## Alta de trabajadores

1. Administración registra el correo y el rol en la pantalla de trabajadores.
2. La cuenta queda pendiente hasta que exista el usuario correspondiente en Supabase Auth.
3. El trabajador solicita un enlace desde `/signin-with-chatgpt`.
4. En el primer acceso, el sistema relaciona el UUID verificado con el registro pendiente por correo.
5. Desactivar el trabajador en la aplicación revoca su acceso funcional y conserva todo su historial.

No se permite el registro público automático (`shouldCreateUser: false`). Los usuarios de Supabase Auth deben ser invitados por administración.

## Despliegue

El proyecto Vercel enlazado es `nstrulesgames/hotel-asael-patrimonio`. Antes del primer preview funcional deben existir las variables privadas y debe añadirse la URL del preview a las Redirect URLs de Supabase Auth.

La base y el bucket se describen en [supabase/README.md](supabase/README.md).
