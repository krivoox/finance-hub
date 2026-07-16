# Spec 15 — Onboarding de workspace

| Campo | Valor |
|-------|-------|
| ID | SPEC-15 |
| Estado | Draft |
| Prioridad | P0 |
| Dependencias | SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05 |

## 1. Contexto

Al crear un workspace (personal en registro o grupal vía `CreateGroupWorkspace`), hoy se seedan categorías (SPEC-04) pero **no hay cuentas**. Sin al menos una cuenta, el ledger no es usable: no se pueden registrar movimientos ni ver patrimonio real.

Esta spec define el **first-run** que deja el workspace listo para usar y, al mismo tiempo, enseña el ritmo de la app (ledger + “Registrar”) **sin** product tour de tooltips.

**Lenguaje de producto:** usar *espacio*, *hogar* o el nombre del workspace. No usar “tienda” en UI ni docs de producto.

## 2. Actores

- Owner / Admin del workspace (pueden completar el setup)
- Member / Viewer (no completan setup; ven empty states si aplica)
- Usuario recién registrado (workspace personal recién creado)

## 3. Historias de usuario

1. Como usuario nuevo, quiero configurar mi espacio en pocos minutos para poder registrar un gasto de inmediato.
2. Como owner que crea un workspace grupal, quiero el mismo setup mínimo antes de invitar a nadie.
3. Como usuario, quiero ver cómo queda el panel (patrimonio / filas) mientras configuro, no un tutorial aparte.
4. Como usuario apurado, quiero poder saltar el primer gasto, pero no quedarme sin cuentas.

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Tras crear workspace personal (registro) o grupal, si el workspace activo **no tiene cuentas**, dirigir al flujo de onboarding (ruta dedicada o sheet full-bleed) |
| FR-02 | Paso **Identidad** (si aún no se capturó): nombre del espacio + `baseCurrency`; opcional confirmar `User.timezone` / `preferredCurrency` |
| FR-03 | Paso **Cuentas** (obligatorio): crear **≥1** cuenta vía `CreateAccount` (nombre, type, `initialBalanceCents`, currency = `baseCurrency`) |
| FR-04 | Paso **Primer gasto** (opcional, skippeable): crear un `CreateExpense` real con categoría seed del workspace |
| FR-05 | Tras completar (o skip del gasto con ≥1 cuenta): marcar setup como listo, set active workspace, redirigir al dashboard |
| FR-06 | Preview de ledger en vivo durante el setup: patrimonio + filas de cuentas / movimiento que se actualizan al confirmar cada paso (mismos tokens/semántica que el producto) |
| FR-07 | Query `GetWorkspaceSetupStatus` indica si el workspace necesita onboarding |
| FR-08 | Owner/admin pueden reentrar al setup solo si aún `needsSetup`; si ya hay cuentas, el flujo no se fuerza |
| FR-09 | Empty states del producto (cuentas, movimientos, dashboard) alineados: CTA a crear cuenta / registrar si el usuario omitió algo |

## 5. Reglas de negocio

### Setup mínimo (“listo para usar”)

- Un workspace está **ready** sii `count(cuentas no archivadas) ≥ 1`.
- Las categorías seed (SPEC-04) ya existen al crear el workspace; el onboarding **no** las vuelve a seedear.
- El primer gasto es opcional; omitirlo no impide `ready`.
- Sin cuenta: **no** se puede completar el onboarding ni crear el primer gasto.

### Disparo y omisión

- Condición primaria de “necesita onboarding”: workspace activo con `accountCount == 0` y el usuario es owner/admin.
- Preferir estado **derivado** (`accountCount`) sobre un flag frágil. Si el usuario elige “omitir setup” sin crear cuenta, persistir preferencia de dismiss (cookie o campo de preferencia de usuario/workspace) para no redirigir en loop; el empty state de `/accounts` sigue ofreciendo CTA.
- Member/viewer **nunca** son forzados al onboarding de creación.

### Datos reales (no demo)

- Cuentas y el gasto opcional son **persistidos de verdad** (mismos comandos que el producto).
- No inventar saldos ficticios que el usuario no confirmó.
- Montos en **centavos** (ADR-001); la UI convierte unidades → `*Cents` en el boundary.

### Moneda y timezone

- `FinanceAccount.currency` debe igualar `Workspace.baseCurrency` (SPEC-03 MVP).
- Periodos del dashboard usan `User.timezone` (SPEC-01 / SPEC-12); si se pide timezone en onboarding, actualizar perfil, no un timezone por workspace.

### Authz

- Completar setup: roles `owner` \| `admin`.
- Viewer/member: forbidden en comandos de setup; pueden usar la app según sus roles si el workspace ya tiene cuentas creadas por otro.

### Idempotencia

- Reentrar al setup con cuentas ya creadas → no forzar wizard; opcionalmente mostrar solo CTA de “primer gasto” si no hay transacciones (P1, no bloqueante).
- No duplicar cuentas automáticamente al reintentar un paso ya confirmado.

## 6. Comandos y consultas

| Tipo | Nombre | Input | Output |
|------|--------|-------|--------|
| Query | `GetWorkspaceSetupStatus` | workspaceId | `{ needsSetup: boolean, accountCount: number, transactionCount: number, dismissedSetup?: boolean }` |
| Query | `IsWorkspaceReadyToUse` | `{ accountCount: number }` (puro) | `boolean` |
| Command | `UpdateWorkspaceIdentity` | workspaceId, name?, baseCurrency? | Workspace |
| Command | `CompleteWorkspaceSetup` | workspaceId | void (idempotente si already ready) |
| Command | `DismissWorkspaceSetup` | workspaceId | void (solo si accountCount == 0; evita redirect loop) |
| — | Reusar | `CreateAccount`, `CreateExpense`, `UpdateProfile` (timezone/currency) | según SPEC-03 / 05 / 01 |

Orquestación UI/application: el wizard puede llamar comandos existentes paso a paso; `CompleteWorkspaceSetup` setea workspace activo y cierra el flujo (no crea entidades por sí solo).

## 7. Criterios de aceptación

- [ ] Registro → workspace personal sin cuentas → usuario owner entra al onboarding (o sheet) en lugar de un dashboard vacío sin guía.
- [ ] `CreateGroupWorkspace` → set active + mismo flujo si no hay cuentas.
- [ ] No se puede finalizar el setup sin ≥1 cuenta.
- [ ] Skip del primer gasto deja workspace ready y dashboard con patrimonio de las cuentas.
- [ ] Primer gasto (si se completa) aparece en recientes / afecta saldo (SPEC-05).
- [ ] Preview refleja los datos confirmados (no miente respecto al shell).
- [ ] Viewer no puede ejecutar setup; owner/admin sí.
- [ ] Currency mismatch cuenta ≠ baseCurrency → error de dominio (SPEC-03).
- [ ] `DismissWorkspaceSetup` evita redirect infinito; empty state de cuentas sigue visible.
- [ ] Copy de producto habla de espacio/hogar/nombre; nunca “tienda”.

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
- **Then** error `WorkspaceNotReady` (o equivalente)

### T-05 Completar setup idempotente

- **Given** workspace con ≥1 cuenta  
- **When** `CompleteWorkspaceSetup` dos veces  
- **Then** OK ambas; sin side effects destructivos

### T-06 Dismiss solo sin cuentas

- **Given** workspace con 1 cuenta  
- **When** `DismissWorkspaceSetup`  
- **Then** error o no-op documentado (no marca dismiss innecesario)

### T-07 Forbidden para viewer

- **Given** membership viewer  
- **When** `CreateAccount` / `CompleteWorkspaceSetup` vía application  
- **Then** `Forbidden`

### T-08 Primer gasto opcional no bloquea ready

- **Given** 1 cuenta, 0 transacciones  
- **When** skip gasto + `CompleteWorkspaceSetup`  
- **Then** ready; `transactionCount` puede ser 0

### T-09 Gasto usa categoría seed

- **Given** workspace con seed categories + 1 cuenta  
- **When** `CreateExpense` con categoryId seed expense  
- **Then** transaction creada; saldo coherente

### T-10 Identity currency

- **Given** workspace ARS  
- **When** `CreateAccount` con currency USD  
- **Then** error currency mismatch (SPEC-03)

## 9. UX (contrato de producto)

Detalle visual en `DESIGN.md`. Contrato mínimo de esta spec:

| Aspecto | Decisión |
|---------|----------|
| Forma | Guided first-run (ruta `/onboarding` o sheet full-bleed), no landing de marketing |
| Pasos máx. | Identidad → Cuentas (1–3) → Primer gasto (skip) → Listo |
| Signature | **Ledger preview vivo**: cada confirmación añade fila/cifra real |
| Mobile | 1 columna; preview bajo el form |
| Desktop | Split: form \| preview |
| Tour | Fuera de alcance MVP; un tip contextual opcional una sola vez junto a “Registrar” tras salir |
| Motion | Revelados cortos (&lt;300ms); respetar `prefers-reduced-motion` |

### Microcopy (referencia)

| Paso | Título | CTA primario |
|------|--------|--------------|
| Identidad | ¿Cómo se llama este espacio? | Continuar |
| Cuentas | ¿Dónde está el dinero hoy? | Guardar cuentas |
| Primer gasto | Registrá un gasto de esta semana | Registrar gasto / Saltar por ahora |
| Listo | Tu espacio ya tiene números | Ir al panel |

Helper recurrente: “Podés editar todo después.”

## 10. Fuera de alcance

- Product tour / coach marks de la nav completa
- Presupuestos, objetivos, splits, invitaciones en el wizard
- Plantillas de cuentas predefinidas avanzadas (P1: chips “Efectivo / Banco / Tarjeta” como atajos de type están OK)
- Datos demo / sandbox no persistidos
- Onboarding de billing o multi-tienda
- SMTP / emails de bienvenida

## 11. Notas de implementación

- Reusar services/actions existentes de accounts y transactions; no duplicar reglas de negocio en UI.
- Dominio puro candidato: `isWorkspaceReadyToUse` en `src/features/workspaces/domain/` (o `src/domain/`).
- Application: orquestar status + dismiss + complete; authz con `requireMembership`.
- Tras `CreateGroupWorkspace`, setear workspace activo (hoy no siempre ocurre) antes o al entrar al onboarding.
- Empty states de `/accounts`, `/transactions`, dashboard: alinear copy y CTA con esta spec (componente `Empty` de shadcn preferible).
- Specs relacionadas: [01-auth](./01-auth.md), [02-workspaces](./02-workspaces.md), [03-accounts](./03-accounts.md), [04-categories](./04-categories.md), [05-transactions](./05-transactions.md), [12-dashboard](./12-dashboard.md).

## 12. Dependencias

| Spec | Uso |
|------|-----|
| SPEC-01 | Registro crea personal; timezone/currency de perfil |
| SPEC-02 | Workspace, roles, active context |
| SPEC-03 | `CreateAccount`, saldo inicial, currency |
| SPEC-04 | Categorías seed para el primer gasto |
| SPEC-05 | `CreateExpense` opcional |
| SPEC-12 | Destino post-setup (dashboard ready / empty coherente) |
