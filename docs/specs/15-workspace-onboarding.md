# Spec 15 — Onboarding de workspace

| Campo | Valor |
|-------|-------|
| ID | SPEC-15 |
| Estado | Implemented (MVP) |
| Prioridad | P0 |
| Dependencias | SPEC-01, SPEC-02, SPEC-03, SPEC-04 |

## 1. Contexto

Al crear un workspace (personal en registro o grupal vía `CreateGroupWorkspace`), se seedan categorías (SPEC-04) pero **no hay cuentas**. Sin al menos una cuenta, el ledger no es usable.

Esta spec define el **first-run** que deja el workspace listo para usar y enseña el ritmo de la app (ledger + “Registrar”) **sin** product tour de tooltips.

**Lenguaje de producto:** *espacio*, *hogar* o el nombre del workspace. No usar “tienda”.

## 2. Actores

- Owner / Admin del workspace (completan el setup)
- Member / Viewer (no completan setup; ven empty states si aplica)
- Usuario recién registrado (workspace personal recién creado)

## 3. Historias de usuario

1. Como usuario nuevo, quiero configurar mi espacio en pocos minutos para poder registrar movimientos de inmediato.
2. Como owner que crea un workspace grupal, quiero el mismo setup mínimo antes de invitar a nadie.
3. Como usuario, quiero ver cómo queda el panel (patrimonio / filas) mientras configuro, no un tutorial aparte.
4. Como usuario apurado, quiero poder omitir el onboarding y crear mi primera cuenta manualmente, pero no quedarme en un estado sin cuentas.

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Tras registro o `CreateGroupWorkspace`, si el workspace activo no tiene cuentas y el rol es owner/admin, dirigir a `/onboarding` (experiencia modal full-viewport **fuera** del AppShell; sin sidebar) |
| FR-02 | Paso 1: pantallazo ilustrado que muestra el espacio (nombre) y la moneda (read-only) |
| FR-03 | Paso 2 (obligatorio): crear **≥1** cuenta vía `CreateAccount` (currency = `baseCurrency`) |
| FR-04 | Tras crear la primera cuenta: `CompleteWorkspaceSetup` (set active + limpia dismiss) → dashboard |
| FR-05 | Preview de ledger **soft** dentro del mismo modal (estado inicial vacío) |
| FR-06 | Query `GetWorkspaceSetupStatus` |
| FR-07 | Si ya hay cuentas, el layout de app **no** fuerza onboarding; `/onboarding` solo se muestra cuando `needsSetup=true` |
| FR-09 | Empty de `/accounts` con CTA “Configurar espacio” si owner/admin y sin cuentas (p. ej. tras dismiss) |
| FR-10 | “Omitir por ahora” (`DismissWorkspaceSetup`) solo con 0 cuentas; cookie `fh-setup-dismissed` evita redirect loop |

## 5. Reglas de negocio

### Setup mínimo (“listo para usar”)

- Ready sii `count(cuentas no archivadas) ≥ 1` (derivado; **no** hay campo Prisma de onboarding).
- Categorías seed ya existen; el onboarding no las reseedea.
- Sin cuenta: no se puede `CompleteWorkspaceSetup`.

### Disparo y omisión

- `needsSetup` = owner/admin ∧ `accountCount == 0` ∧ no dismissed.
- Dismiss: cookie httpOnly `fh-setup-dismissed` (ids de workspace separados por coma).
- Member/viewer nunca son forzados al onboarding.
- Gate: layout `(app)` redirige a `/onboarding` si `needsSetup`. Middleware envía sesión autenticada desde forms de auth hacia `/onboarding`.

### Datos reales

- Cuentas son persistidas (mismos comandos del producto).
- Montos en centavos (ADR-001).

### Moneda

- `FinanceAccount.currency` = `Workspace.baseCurrency` (SPEC-03).
- Timezone de periodos sigue en `User.timezone` (SPEC-01); **no** se pide en el wizard MVP.

### Authz

- Setup: `owner` \| `admin` (`assertCanManageSetup`).

## 6. Comandos y consultas

| Tipo | Nombre | Notas |
|------|--------|-------|
| Query | `GetWorkspaceSetupStatus` | Incluye `needsSetup`, counts, `dismissedSetup`, role, name, currency |
| Query | `IsWorkspaceReadyToUse` | Dominio puro |
| Command | `CompleteWorkspaceSetup` | Requiere ready; set `fh-workspace-id`; limpia dismiss |
| Command | `DismissWorkspaceSetup` | Solo si `accountCount == 0` |
| — | Reusar | `CreateAccount` |

## 7. Criterios de aceptación

- [x] Registro → `/onboarding` (sin AppShell) en lugar de dashboard vacío sin guía.
- [x] `CreateGroupWorkspace` → set active + redirect a `/onboarding`.
- [x] No se puede finalizar el setup sin ≥1 cuenta.
- [x] El usuario sale del onboarding creando su primera cuenta; no existe paso de gasto en el MVP.
- [x] Preview dentro del modal; sin escape por sidebar.
- [x] Viewer/member no gestionan setup (`assertCanManageSetup`).
- [x] Currency mismatch → error dominio (SPEC-03).
- [x] Dismiss evita loop; `/accounts` ofrece CTA a configurar.
- [x] Copy habla de espacio/hogar; nunca “tienda”.

## 8. Escenarios de test (TDD)

### T-01 Ready con una cuenta

- **Given** `accountCount = 1`  
- **When** `IsWorkspaceReadyToUse`  
- **Then** `true`

### T-02 No ready sin cuentas

- **Given** `accountCount = 0`  
- **When** `IsWorkspaceReadyToUse`  
- **Then** `false`

### T-03 Setup status needsSetup

- **Given** workspace sin cuentas, usuario owner, no dismissed  
- **When** `GetWorkspaceSetupStatus`  
- **Then** `needsSetup = true`

### T-04 Completar setup requiere cuenta

- **Given** workspace sin cuentas  
- **When** `CompleteWorkspaceSetup`  
- **Then** error `WorkspaceNotReady`

### T-05 Completar setup idempotente

- **Given** workspace con ≥1 cuenta  
- **When** `CompleteWorkspaceSetup` dos veces  
- **Then** OK ambas

### T-06 Dismiss solo sin cuentas

- **Given** workspace con 1 cuenta  
- **When** `DismissWorkspaceSetup`  
- **Then** error `SetupDismissNotAllowed`

### T-07 Forbidden para viewer

- **Given** role viewer  
- **When** `CompleteWorkspaceSetup` / manage setup  
- **Then** `Forbidden`

## 9. UX (contrato de producto)

| Aspecto | Decisión |
|---------|----------|
| Forma | Modal full-viewport en ruta `/onboarding` (grupo `(onboarding)`), **sin** AppShell/sidebar |
| Progreso | Línea hairline `info` en el borde superior del modal |
| Pasos | Paso 1 (ilustrado) → Paso 2 (crear primera cuenta) → dashboard |
| Signature | Preview ledger **soft** dentro del modal |
| Escape | No hay nav lateral; “Omitir por ahora” solo link muted (dismiss) |
| Motion | &lt;300ms; `prefers-reduced-motion` |

### Microcopy

| Paso | Título | CTA |
|------|--------|-----|
| Paso 1 | Tu espacio está casi listo | Continuar |
| Paso 2 | Creá tu primera cuenta | Crear cuenta y empezar |

## 10. Fuera de alcance

- Product tour / coach marks
- Presupuestos, objetivos, splits, invitaciones en el wizard
- Pedir timezone en el wizard
- Campo Prisma `setupCompletedAt`
- Datos demo no persistidos
- SMTP / emails de bienvenida

## 11. Notas de implementación

| Pieza | Ubicación |
|-------|-----------|
| Dominio | `src/features/workspaces/domain/setup.ts` |
| Cookie dismiss | `fh-setup-dismissed` (`setup-cookie.ts`) |
| Services | `getWorkspaceSetupStatus`, `completeWorkspaceSetup`, `dismissWorkspaceSetup` |
| UI | `onboarding-wizard.tsx`, `ledger-preview.tsx` |
| Rutas | `src/app/(onboarding)/onboarding/page.tsx` + layout soft |
| Gate app | `src/app/(app)/layout.tsx` → redirect si `needsSetup` |
| Auth redirect | `register-form` → `/onboarding`; middleware auth forms → `/onboarding` |

## 12. Dependencias

| Spec | Uso |
|------|-----|
| SPEC-01 | Registro + redirect post-auth |
| SPEC-02 | Workspace, roles, active cookie |
| SPEC-03 | `CreateAccount` |
| SPEC-04 | Categorías seed |
| SPEC-12 | Dashboard post-setup |
