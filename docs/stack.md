# Stack tecnológico

Stack **fijado** — mismo que la plantilla Siturn (`turno-app/template.md`). No sustituir por Firebase, Supabase Auth de producto, microservicios u otro stack salvo pedido explícito.

Versiones de referencia: `turno-app` / Siturn (marzo 2026). Mantener alineadas salvo upgrade acordado.

## Tabla del stack

| Capa | Tecnología | Versión |
|------|------------|---------|
| Runtime | Node.js | `>=20.9.0` |
| Framework | Next.js (App Router) | `16.x` (alineado a Siturn; hoy puede ser `16.2.x`) |
| UI | React / React DOM | `19.2.4` |
| Lenguaje | TypeScript | `^5` (strict + `noUncheckedIndexedAccess`) |
| Estilos | Tailwind CSS | `^4` (`@tailwindcss/postcss`) |
| Componentes | shadcn/ui | `^4.x` (preset `base-nova`) |
| Primitivos UI | `@base-ui/react` | `^1.5.0` |
| Iconos | `lucide-react` | `^1.x` |
| Forms | `react-hook-form` + `@hookform/resolvers` | `^7` / `^5` |
| Validación | Zod | `^4` |
| Auth producto | **Better Auth** | `^1.6.x` |
| ORM | Prisma + `@prisma/adapter-pg` | `^7.8.x` |
| Driver SQL | `pg` | `^8.21.x` |
| Base de datos | PostgreSQL (hosting **Supabase**) | — |
| Supabase SDK | `@supabase/supabase-js`, `@supabase/ssr` | `^2.78` / `^0.10` |
| Estado servidor (cliente) | TanStack React Query | `^5` |
| Estado UI | Zustand | `^5` (**solo UI**) |
| Fechas | `date-fns`, `@date-fns/tz` | `^4` / `^1.5` |
| Toasts | Sonner | `^2` |
| Utilidades CSS | `clsx`, `tailwind-merge`, `cva` | según Siturn |
| Animaciones | `tw-animate-css` | `^1.4` |
| Compilador | React Compiler (`babel-plugin-react-compiler`) | `1.0.0` en `next.config` |
| Lint / format | ESLint 9 + `eslint-config-next` + Prettier | según Siturn |
| CLI local DB | Supabase CLI | `^2.100` (devDependency) |
| Tests (negocio) | Vitest | a configurar en Fase 0 |

## Qué hace cada pieza

| Pieza | Rol en Finance Hub |
|-------|-------------------|
| **Next.js** | Monolito: UI + Server Actions + Route Handlers |
| **Better Auth** | Única auth de producto (email/password). **No** Supabase Auth |
| **Prisma** | Schema, migraciones, queries tipadas en servidor |
| **Postgres (Supabase)** | Persistencia, constraints, RLS |
| **Supabase SDK** | Storage / Realtime / clientes cuando haga falta — no reemplaza Prisma ni Better Auth |
| **Zod** | Validación doble: forms (cliente) + Server Actions |
| **React Query** | Cache/fetch en Client Components |
| **Zustand** | Solo UI (modales, sidebar, workspace activo en cliente) |
| **Vitest** | TDD de lógica de negocio (no UI) |

## Prohibido (salvo pedido explícito)

- Firebase
- Supabase Auth para login de usuarios del producto
- Microservicios / colas dedicadas prematuras
- ORMs o auth stacks alternativos (Drizzle + Clerk, etc.)

## Variables de entorno

Centralizadas en `src/lib/env.ts` (Zod). No dispersar `process.env`.

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# Opcional (solo desarrollo): loguear cada statement SQL de Prisma
# PRISMA_LOG_QUERIES=0
```

- Secret: `openssl rand -base64 32` → `BETTER_AUTH_SECRET`
- Producción: `DATABASE_URL` → pooler (`:6543`, `?pgbouncer=true`); `DIRECT_URL` → sesión directa para migraciones
- `BETTER_AUTH_URL`: dominio canónico (fallback). En Vercel **Production** = dominio de `main`. En **Preview** el runtime prioriza `VERCEL_URL` y Better Auth usa Dynamic Base URL con `*.vercel.app` (ver `src/lib/env.ts` + `src/lib/auth.ts`). Preferible: no setear `BETTER_AUTH_URL` en Environment Preview. Opcional: `BETTER_AUTH_TRUSTED_ORIGINS`
- `PRISMA_LOG_QUERIES`: `1` / `true` imprime `prisma:query` en desarrollo; por defecto off (Zod en `src/lib/env.ts`). No afecta producción (solo `error`).

## Scripts esperados (`package.json`)

| Script | Uso |
|--------|-----|
| `dev` | `next dev` |
| `build` / `start` | producción |
| `lint` | eslint |
| `format` | prettier |
| `test` / `test:watch` | Vitest |
| `postinstall` | `prisma generate` |
| `db:generate` / `db:migrate` / `db:push` / `db:studio` | Prisma |
| `auth:generate` | Better Auth CLI → modelos en schema |
| `supabase:start` / `stop` / `status` | DB local |

## Rutas de producto (variables)

| Variable | Valor Finance Hub |
|----------|-------------------|
| `PROJECT_NAME` | Finance Hub |
| `PROJECT_SLUG` | `finance-hub` |
| `DEFAULT_LOCALE` | `es` |
| `DASHBOARD_PATH` | `/dashboard` |
| `AUTH_LOGIN_PATH` | `/login` |
| `AUTH_REGISTER_PATH` | `/registro` |

## Infra obligatoria (cuando se scaffold)

Misma que Siturn — ver detalle en [architecture.md](./architecture.md):

- `src/lib/env.ts`, `prisma.ts`, `auth.ts`, `session.ts`, `auth-client.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/lib/supabase/client.ts`, `server.ts`
- `src/middleware.ts` (cookie `better-auth*`)
- `src/components/providers.tsx` (QueryClient + Sonner)
- `prisma/schema.prisma` + `prisma.config.ts`

Referencia de implementación: repo `turno-app` (Siturn).
