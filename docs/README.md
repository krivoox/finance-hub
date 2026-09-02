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
| [architecture.md](./architecture.md) | Capas, carpetas, auth, datos, memoización, shell autenticado, soft-nav, PWA/SW |
| [tdd-workflow.md](./tdd-workflow.md) | Cómo aplicar TDD en este repo |
| [roadmap.md](./roadmap.md) | Orden de implementación sugerido |
| [glossary.md](./glossary.md) | Glosario de términos de negocio |
| [guides/workspaces-and-invites.md](./guides/workspaces-and-invites.md) | Workspace personal, onboarding y grupos de splits (KRI-29) |
| [guides/git-flow.md](./guides/git-flow.md) | Git Flow: `main`/`develop`, PRs, borrado de ramas, Vercel |
| [guides/changelog.md](./guides/changelog.md) | Changelog, Conventional Commits, SemVer y releases |
| [guides/maestro-mcp.md](./guides/maestro-mcp.md) | Maestro MCP: smoke UI web (Chromium) desde Cursor |
| [guides/email-resend.md](./guides/email-resend.md) | Resend: reset password, marketing, MCP vs SDK (KRI-17) |
| [security-audit.md](./security-audit.md) | Auditoría de seguridad (KRI-16): Supabase/RLS, authz, headers, plan |
| [analysis/kri-35-ajustes-moneda-timezone.md](./analysis/kri-35-ajustes-moneda-timezone.md) | KRI-35: moneda default, timezone y tab Cuenta (análisis; sin rediseño de ledger) |
| [DESIGN.md](../DESIGN.md) | Design system UI/UX (ledger navy, tokens, shell, variantes) |

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
| 09 | [Grupos de splits (SplitGroup) — KRI-29](./specs/09-financial-groups.md) | P1 |
| 10 | [Distribución de gastos (splits)](./specs/10-expense-splitting.md) | P1 |
| 11 | [Analytics e insights](./specs/11-analytics.md) | P2 |
| 12 | [Dashboard](./specs/12-dashboard.md) | P1 |
| 13 | [Detalle de movimiento](./specs/13-transaction-detail.md) | P1 |
| 14 | [Dinero cross-workspace](./specs/14-cross-workspace-money.md) | **Retirada (KRI-29)** |
| 15 | [Onboarding de workspace](./specs/15-workspace-onboarding.md) | P0 |
| 16 | [Canje de moneda (FX)](./specs/16-currency-exchange.md) | P1 |
| 17 | [Landing de marketing](./specs/17-marketing-landing.md) | P0 |
| 18 | [Transacciones recurrentes](./specs/18-recurring-transactions.md) | P1 |
| 19 | [Cotizaciones USD (DolarApi)](./specs/19-usd-quotes-dolarapi.md) | P1 |
| 20 | [Performance, navegación y PWA](./specs/20-performance-pwa.md) | P0 |
| 21 | [Email transaccional y marketing (Resend)](./specs/21-email-resend.md) | P0 |
| 22 | [Ajuste de saldo / deuda (KRI-36)](./specs/22-balance-adjustment.md) | P1 |

## Decisiones de arquitectura (ADR)

| ADR | Tema |
|-----|------|
| [001](./adr/001-money-as-integer-cents.md) | Dinero como enteros (centavos) |
| [002](./adr/002-workspace-tenancy.md) | Workspace como unidad de tenancy (histórico; enmendado) |
| [003](./adr/003-tdd-domain-only.md) | TDD solo en lógica de negocio |
| [004](./adr/004-stack-siturn.md) | Stack Siturn (template) |
| [005](./adr/005-changelog-semver.md) | Changelog automatizado y SemVer |
| [006](./adr/006-multi-currency-ars-usd.md) | Multi-moneda ARS + USD |
| [007](./adr/007-split-group-tenancy.md) | Workspace personal + SplitGroup (KRI-29; enmienda ADR-002) |
| [008](./adr/008-resend-email.md) | Email con Resend (SDK servidor) |

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
