# Documentación — Finance Hub

Índice de la documentación del producto. El agente y el equipo deben tratar estos documentos como **fuente de verdad** antes de implementar.

## Cómo usar esta carpeta

1. Leer la [visión](./vision.md) para el contexto del producto.
2. Consultar el [stack](./stack.md), el [modelo de dominio](./domain-model.md) y la [arquitectura](./architecture.md).
3. Abrir la [spec](./specs/) de la funcionalidad a construir.
4. Seguir el [flujo TDD](./tdd-workflow.md): tests de negocio primero; UI después, sin tests de UI.

## Documentos base

| Documento | Descripción |
|-----------|-------------|
| [vision.md](./vision.md) | Visión, objetivos, usuarios y principios |
| [stack.md](./stack.md) | Stack tecnológico fijado (Siturn / template) |
| [domain-model.md](./domain-model.md) | Entidades, value objects, invariantes |
| [architecture.md](./architecture.md) | Capas, carpetas, auth, datos, memoización por request |
| [tdd-workflow.md](./tdd-workflow.md) | Cómo aplicar TDD en este repo |
| [roadmap.md](./roadmap.md) | Orden de implementación sugerido |
| [glossary.md](./glossary.md) | Glosario de términos de negocio |
| [guides/workspaces-and-invites.md](./guides/workspaces-and-invites.md) | Workspaces, roles, invitaciones y first-run (onboarding) |
| [guides/git-flow.md](./guides/git-flow.md) | Git Flow: `main`/`develop`, PRs, borrado de ramas, Vercel |
| [guides/changelog.md](./guides/changelog.md) | Changelog, Conventional Commits, SemVer y releases |
| [guides/maestro-mcp.md](./guides/maestro-mcp.md) | Maestro MCP: smoke UI web (Chromium) desde Cursor |
| [DESIGN.md](../DESIGN.md) | Design system UI/UX (tokens, shell Dub-like, variantes) |

## Specs (Spec-Driven Development)

| # | Spec | Prioridad sugerida |
|---|------|--------------------|
| 01 | [Autenticación y perfil](./specs/01-auth.md) | P0 |
| 02 | [Workspaces](./specs/02-workspaces.md) | P0 |
| 03 | [Cuentas](./specs/03-accounts.md) | P0 |
| 04 | [Categorías](./specs/04-categories.md) | P0 |
| 05 | [Transacciones](./specs/05-transactions.md) | P0 |
| 06 | [Transferencias](./specs/06-transfers.md) | P0 |
| 07 | [Presupuestos](./specs/07-budgets.md) | P1 |
| 08 | [Objetivos financieros](./specs/08-goals.md) | P1 |
| 09 | [Grupos y gastos compartidos](./specs/09-financial-groups.md) | P1 |
| 10 | [Distribución de gastos (splits)](./specs/10-expense-splitting.md) | P1 |
| 11 | [Analytics e insights](./specs/11-analytics.md) | P2 |
| 12 | [Dashboard](./specs/12-dashboard.md) | P1 |
| 13 | [Detalle de movimiento](./specs/13-transaction-detail.md) | P1 |
| 14 | [Dinero cross-workspace](./specs/14-cross-workspace-money.md) | P1 |
| 15 | [Onboarding de workspace](./specs/15-workspace-onboarding.md) | P0 |
| 16 | [Canje de moneda (FX)](./specs/16-currency-exchange.md) | P1 |

## Decisiones de arquitectura (ADR)

| ADR | Tema |
|-----|------|
| [001](./adr/001-money-as-integer-cents.md) | Dinero como enteros (centavos) |
| [002](./adr/002-workspace-tenancy.md) | Workspace como unidad de tenancy |
| [003](./adr/003-tdd-domain-only.md) | TDD solo en lógica de negocio |
| [004](./adr/004-stack-siturn.md) | Stack Siturn (template) |
| [005](./adr/005-changelog-semver.md) | Changelog automatizado y SemVer |
| [006](./adr/006-multi-currency-ars-usd.md) | Multi-moneda ARS + USD |

## Formato de una spec

Cada spec en `specs/` incluye:

- Contexto y actores
- Historias de usuario
- Requisitos funcionales
- Reglas de negocio / invariantes
- Comandos y consultas
- Criterios de aceptación
- Escenarios de test (Given / When / Then) para TDD
- Fuera de alcance
- Dependencias
