<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Finance Hub — Guía del agente

## Qué es este producto

Finance Hub es una aplicación web de finanzas personales para centralizar y gestionar movimientos de una persona, pareja o grupo familiar.

Objetivos:

- Registrar ingresos, gastos y transferencias en múltiples cuentas (bancos, billeteras, efectivo, tarjetas de crédito).
- Ofrecer visión completa y en tiempo real del estado financiero.
- Analizar hábitos de consumo, presupuestos, ahorro y progreso hacia objetivos.
- Permitir grupos financieros con gastos compartidos, balances individuales/grupales y distribución de gastos.

Visión: convertirse en el centro de administración financiera del hogar.

## Documentación

| Archivo | Contenido |
|---------|-----------|
| **[docs/README.md](./docs/README.md)** | Índice de specs, dominio, TDD |
| **[docs/stack.md](./docs/stack.md)** | Stack fijado (Siturn / template) |
| **[docs/architecture.md](./docs/architecture.md)** | Capas, carpetas, auth, datos, patrones |
| **[DESIGN.md](./DESIGN.md)** | Sistema visual |
| **README.md** | Setup local |

- Cambios técnicos / estructura → `docs/stack.md` + `docs/architecture.md`
- UI → `DESIGN.md`
- Reglas de negocio → `docs/specs/` + `docs/domain-model.md`

## Fuente de verdad (implementación)

1. Leer `docs/README.md`.
2. Spec en `docs/specs/`.
3. `docs/domain-model.md` + `docs/architecture.md` + `docs/stack.md`.
4. Flujo TDD en `docs/tdd-workflow.md`.

No inventar reglas que contradigan las specs. Si falta detalle, actualizar la spec antes de codificar.

## Stack (resumen)

Mismo que Siturn — detalle en `docs/stack.md`:

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, shadcn
- **Better Auth** (no Supabase Auth)
- **Prisma** + Postgres (Supabase)
- Zod + RHF, TanStack Query, Zustand (solo UI)
- Vitest para TDD de negocio

## TDD obligatorio (lógica de negocio)

1. Test que falla (red) → mínimo código (green) → refactor.
2. Se testea: `src/domain/**`, `src/features/*/domain/**`, cálculos y servicios puros.
3. **No** se testea UI (React, CSS, snapshots).

```
spec → tests (Given/When/Then) → domain → services (Prisma) → actions → UI
```

## Estructura de código

```
src/
  domain/           # Money y reglas compartidas (puro, TDD)
  features/<name>/  # domain/, services/, actions/, schemas/, components/
  lib/              # env, auth, prisma, session, supabase
  app/              # rutas delgadas
  components/ui/    # shadcn
```

- Domain no importa Next/React/Prisma.
- UI no contiene reglas de negocio.
- Theme: tokens semánticos en `globals.css`; sin hex sueltos ni `zinc-*`/`blue-*` en UI.

## Convenciones

- Código/dominio en inglés; docs de producto en español.
- Dinero: centavos enteros (ADR-001).
- Fechas: ISO 8601; timezone explícita en periodos.
- Multi-tenancy: `Workspace` (ADR-002).
- Git Flow: ramas `feat/` / `fix/` / `chore/`; no commit directo a `main`/`develop`.

## Checklist de feature

- [ ] Spec leída; criterios cubiertos
- [ ] Tests de dominio primero y en verde
- [ ] Sin lógica de negocio en UI
- [ ] Sin tests de UI
- [ ] `getSession` + Zod + authz workspace en cada Server Action
- [ ] Sin `process.env` fuera de `src/lib/env.ts`
