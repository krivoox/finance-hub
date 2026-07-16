# Roadmap de implementación

Orden sugerido para el agente. Cada ítem: **spec → TDD dominio/application → infraestructura → UI**.

## Fase 0 — Cimientos (stack Siturn)

1. Scaffold infra Siturn: Better Auth, Prisma, `src/lib/*`, middleware, providers, `.env.example` ([stack.md](./stack.md))
2. Configurar Vitest + scripts `test` / `test:watch`
3. Value object `Money` en `src/domain/money` + tests (ADR-001)
4. Estructura `src/features/*` según [architecture.md](./architecture.md)
5. Auth mínima: login/registro + Workspace personal al registrarse (SPEC-01)

## Fase 1 — P0 Core ledger

| Orden | Spec | Entregable |
|-------|------|------------|
| 1 | [01-auth](./specs/01-auth.md) | Registro/login + workspace personal |
| 2 | [02-workspaces](./specs/02-workspaces.md) | Listado y contexto activo |
| 3 | [03-accounts](./specs/03-accounts.md) | Cuentas + saldo derivado |
| 4 | [04-categories](./specs/04-categories.md) | Seed + CRUD |
| 5 | [05-transactions](./specs/05-transactions.md) | Income/expense |
| 6 | [06-transfers](./specs/06-transfers.md) | Transferencias |
| 6b | [15-workspace-onboarding](./specs/15-workspace-onboarding.md) | First-run: cuentas + preview ledger (tras 03–05) |

## Fase 2 — P1 Control y hogar

| Orden | Spec | Entregable |
|-------|------|------------|
| 7 | [12-dashboard](./specs/12-dashboard.md) | Read model básico (puede ir en paralelo parcial) |
| 8 | [07-budgets](./specs/07-budgets.md) | Presupuestos |
| 9 | [08-goals](./specs/08-goals.md) | Objetivos |
| 10 | [09-financial-groups](./specs/09-financial-groups.md) + [10-expense-splitting](./specs/10-expense-splitting.md) | Grupos y splits |

## Fase 2.5 — Detalle y cross-workspace

| Orden | Spec | Entregable |
|-------|------|------------|
| 10b | [13-transaction-detail](./specs/13-transaction-detail.md) | Ficha `/transactions/[id]` + edit/delete UI |
| 10c | [14-cross-workspace-money](./specs/14-cross-workspace-money.md) | Aporte entre espacios + expense funded externo |

## Fase 3 — P2 Insights

| Orden | Spec | Entregable |
|-------|------|------------|
| 11 | [11-analytics](./specs/11-analytics.md) | Agregaciones e insights |
| 12 | Enriquecer dashboard con insights | |

## Regla

No saltar a UI de una feature sin tests verdes de su dominio/casos de uso.
