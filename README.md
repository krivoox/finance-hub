# Finance Hub

Aplicación web de finanzas personales para centralizar ingresos, gastos y transferencias de una persona, pareja o grupo familiar.

## Documentación

Fuente de verdad en [`docs/`](./docs/README.md):

| Doc | Tema |
|-----|------|
| [docs/stack.md](./docs/stack.md) | Stack (Siturn / Better Auth / Prisma / Supabase) |
| [docs/architecture.md](./docs/architecture.md) | Capas y carpetas |
| [docs/specs/](./docs/specs/) | Specs SDD por funcionalidad |
| [docs/tdd-workflow.md](./docs/tdd-workflow.md) | TDD de lógica de negocio |
| [AGENTS.md](./AGENTS.md) | Guía del agente |
| [DESIGN.md](./DESIGN.md) | UI |

## Stack (resumen)

- Next.js 16 · React 19 · TypeScript · Tailwind 4 · shadcn
- Better Auth · Prisma · PostgreSQL (Supabase)
- Zod · React Hook Form · TanStack Query · Zustand (UI)
- Vitest para TDD de dominio (no UI)

Detalle: [docs/stack.md](./docs/stack.md).

## Desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Cuando la infra Siturn esté cableada: `supabase:start` → `auth:generate` → `db:migrate` → `dev` (ver stack.md).

## Convenciones del agente

- Implementar contra specs en `docs/specs/`
- **TDD obligatorio** para dominio; **no** testear UI
- Seguir `docs/architecture.md` (features + lib, no microservicios)
