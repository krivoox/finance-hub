# Spec 03 — Cuentas (ABM completo)

| Campo | Valor |
|-------|-------|
| ID | SPEC-03 |
| Estado | Ready (diseño ABM) |
| Prioridad | P0 |
| Dependencias | SPEC-02 |
| Relacionadas | SPEC-05, SPEC-06, SPEC-08, SPEC-14, SPEC-15, SPEC-16, SPEC-18 |

## 1. Contexto

Las cuentas representan dónde está el dinero (o deuda, en tarjetas de crédito). El saldo es derivado. Un workspace puede tener cuentas en **ARS y USD** (multi-ledger); la moneda de la cuenta es fija.

Esta spec cubre el **ABM completo**: crear, listar, editar, archivar, desarchivar y **eliminar (hard-delete)**.

### Dos bajas (producto v1)

| Acción | Efecto | Historial | Selectores / formularios activos |
|--------|--------|-----------|----------------------------------|
| **Archivar** (`ArchiveAccount`) | Soft-delete: `isArchived = true` | Se conserva | La cuenta **no aparece** |
| **Eliminar** (`DeleteAccount`) | Hard-delete: borra la fila y cascada de dominio | **Se pierde** (txs asociadas, etc.) | N/A |

Copy en UI: ambas acciones visibles con distinción clara (“Archivar” vs “Eliminar permanentemente”). Confirmación fuerte obligatoria en Eliminar.

### Excepción a soft-delete transversal

La regla de `docs/domain-model.md` (“preferir soft-delete / archive cuando hay historial”) **sigue siendo el default**. `DeleteAccount` es una **excepción explícita de producto en v1**: el usuario elige borrar y acepta perder historial. Archive sigue siendo el camino recomendado; delete es destructivo y guardado.

## 2. Actores

- Owner, Admin, Member: **mutación completa** (create, update, archive, unarchive, delete)
- Viewer: solo lectura

Alineado a authz existente (`assertCanMutateAccounts`: viewer → `Forbidden`).

## 3. Historias de usuario

1. Quiero crear cuentas de distintos tipos con saldo inicial.
2. Quiero crear una cuenta en dólares en un workspace en pesos.
3. Quiero ver el saldo actual de cada cuenta en su moneda.
4. Quiero **editar** el nombre y, en crédito, el límite (opcional).
5. Quiero **archivar** una cuenta que ya no uso **sin perder historial** (desaparece de formularios).
6. Quiero **desarchivar** una cuenta archivada para volver a usarla.
7. Quiero **eliminar permanentemente** una cuenta sabiendo que **pierdo el historial** (confirmación fuerte).
8. No quiero poder archivar/eliminar una cuenta vinculada a un **objetivo activo**.

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Crear account con type, currency (ARS\|USD), initialBalance; `creditLimitCents` **opcional** si `type=credit_card` |
| FR-02 | Listar accounts activas (y opción incluir archivadas); agrupar/mostrar por moneda |
| FR-03 | Calcular `currentBalance` = initial + efectos de txs **solo en la moneda de la cuenta** |
| FR-04 | Actualizar name; creditLimit si type=credit_card (currency **inmutable**). UI de edición requerida |
| FR-05 | Archivar / desarchivar |
| FR-06 | Rechazar nuevas txs en cuenta archivada |
| FR-07 | Cuenta archivada **excluida** de selectores/formularios de flujos activos (txs, transfers, goals, recurrentes, etc.) salvo pantallas que listen archivadas explícitamente |
| FR-08 | `DeleteAccount` (hard-delete) con guards §5.4 y cascada §5.5 |
| FR-09 | Bloquear `ArchiveAccount` y `DeleteAccount` si hay Goal `status=active` con `linkedAccountId = accountId` |
| FR-10 | Permitir archivar la **última** cuenta activa → reabre onboarding (`needsSetup`, SPEC-15) |
| FR-11 | Bloquear hard-delete si la cuenta es la **última activa** del workspace |

## 5. Reglas de negocio

### 5.1 Creación y edición

- `currency ∈ { ARS, USD }` (`ACCOUNT_CURRENCIES`). Puede diferir de `workspace.baseCurrency`.
- `currency` es **inmutable** tras CreateAccount.
- Default de currency al crear = `workspace.baseCurrency` si no se envía.
- `initialBalance` puede ser 0 (en la moneda de la cuenta); entero ≥ 0 (centavos).
- **creditLimit al crear (UI y API):** opcional. Si se omite / null en `credit_card` → OK (`creditLimitCents = null`). Si se envía → entero > 0. Si se envía en tipo ≠ `credit_card` → `InvalidCreditLimit`.
- Nombre no vacío (trim), max 80 chars.
- Credit card: saldo positivo = deuda (convención abajo).

### 5.2 Convención de saldo en credit_card

- `currentBalance >= 0` significa monto adeudado (no se modela la deuda como saldo negativo).
- Un expense en la tarjeta **aumenta** el balance (más deuda).
- Un income en la tarjeta **disminuye** deuda (ajuste/crédito; **no** mueve liquidez de otra cuenta).
- **Pago típico del resumen:** transferencia same-currency **hacia** la tarjeta (origen = banco/efectivo/billetera, destino = `credit_card`) → baja la deuda y descuenta el origen ([SPEC-06](./06-transfers.md)).
- Transferencia **desde** la tarjeta (origen = tarjeta) → aumenta deuda (adelanto en efectivo).

Documentar en código con tests explícitos (`calculateAccountBalance`).

**UI:** en `/accounts`, filas `credit_card` con deuda > 0 ofrecen CTA **Pagar** (FormSheet → `CreateTransfer` origen asset → tarjeta). Tip contextual dismissible (`tip.credit_card_pay`, localStorage `fh:tips:v1`). Alternativa manual: Transacciones → Transferencia.

### 5.3 Archivar / desarchivar

- Archive = soft-delete; historial de txs intacto; `isArchived = true`.
- Unarchive = `isArchived = false`. Idempotente si ya está en el estado pedido.
- **Última cuenta activa:** **permitido archivar**. Tras archivar, `count(no archivadas) = 0` → workspace no ready; `needsSetup` puede volver a `true` para owner/admin (SPEC-15; `accountCount` ya cuenta solo `isArchived: false`).
- **Goal activo:** si existe Goal con `linkedAccountId = accountId` y `status = 'active'` → **bloquear** Archive con `AccountLinkedToActiveGoal`. Goals `completed` / `cancelled` **no** bloquean archive.
- **Recurring (SPEC-18 §4.7):** al archivar, toda `RecurringRule` `active` con `accountId` o `counterpartyAccountId` = X → `paused` + `pausedReason = account_archived`. Desarchivar **no** reactiva esas reglas.
- Cuentas archivadas no aceptan nuevas txs / materializaciones (`AccountArchived`).

### 5.4 Eliminar (hard-delete) — guards

Precondiciones (fallar **antes** de borrar nada):

| # | Guard | Error tipado |
|---|-------|--------------|
| 1 | Membership + `assertCanMutateAccounts` (viewer no) | `Forbidden` |
| 2 | Cuenta existe en el workspace del membership | `AccountNotFound` |
| 3 | Goal `status=active` con `linkedAccountId = accountId` | `AccountLinkedToActiveGoal` |
| 4 | La cuenta es la **única no archivada** del workspace | `CannotDeleteLastActiveAccount` |
| 5 | Alguna tx de la cuenta participa en `CrossWorkspaceLink` (como source o target) | `AccountHasCrossWorkspaceLinks` |

**Decisión residual (cerrada en esta spec):**

- **Archive última activa:** permitido → reabre setup (SPEC-15).
- **Hard-delete última activa:** **bloqueado** (`CannotDeleteLastActiveAccount`) cuando `!isArchived && activeAccountCount === 1`.
- **Hard-delete de cuenta ya archivada:** permitido aunque el workspace quede / esté en 0 activas (la guard de “última activa” no aplica si `isArchived`).
- **Hard-delete con historial:** **permitido** si pasan los guards. Exige confirmación fuerte en UI (nombre de cuenta). Cascada §5.5 — el usuario acepta perder historial de esa cuenta **y** el efecto colateral en la contraparte de transfers/canjes del mismo workspace.

No se bloquea solo por “tener txs”; el producto pide poder borrar y perder historial.

### 5.5 Orden de borrado (DeleteAccount) — cascada de servicio

Prisma hoy: FKs a `FinanceAccount` con `onDelete: Restrict` en `Transaction`, `RecurringRule`, `Goal.linkedAccount`, `CurrencyExchange` (cuentas). El service **debe** borrar en orden dentro de **una** transacción DB — **no** cambiar Restrict a Cascade global.

Dado `accountId = X` (workspace W):

1. **Guards** §5.4 (lectura consistente; re-check dentro de la tx).
2. **Goals no activos** con `linkedAccountId = X` (`completed` \| `cancelled`): `SET linkedAccountId = NULL`. Goals `active` ya bloqueados por guard.
3. **RecurringRule** con `accountId = X` **o** `counterpartyAccountId = X`:
   1. `UPDATE Transaction SET recurringRuleId = NULL, scheduledOn = NULL` donde `recurringRuleId` ∈ esas reglas (libera Restrict; txs de X se borran en pasos 4–5; txs huérfanas de otras cuentas — no esperado — quedan manuales).
   2. **Hard-delete** esas `RecurringRule` (excepción a SPEC-18 §4.4 / UI de recurrentes).
4. **CurrencyExchange** en W donde `fromAccountId = X` o `toAccountId = X`:
   - Por cada exchange: aplicar undo de dominio a ambas piernas si aplica → **delete** las dos `Transaction` (`fromTransactionId`, `toTransactionId`). El row `CurrencyExchange` cae por `onDelete: Cascade` desde txs **o** se borra explícitamente antes/después; no dejar FKs Restrict a X.
5. **Transactions restantes** en W donde `accountId = X` **o** `counterpartyAccountId = X` (transfers same-workspace con la otra pata):
   - Por cada tx, en orden seguro (hijos primero):
     - `GoalContribution` → delete + revertir `Goal.currentAmount` / status (mismo helper que delete-tx, SPEC-08)
     - `ExpenseSplit` (+ shares) si la tx es el expense del split → cascade delete del split
     - `CrossWorkspaceLink`: **no debería quedar** tras guard 5; si aparece → abort + rollback
   - Luego `DELETE` la tx.
   - **Efecto colateral documentado:** borrar transfer A↔B al eliminar A cambia el saldo derivado de B.
6. **Delete** `FinanceAccount` X.

Si cualquier paso falla → rollback total. Confirmación UI (`confirmName`) se valida **antes** de entrar a la cascada (action/service).

### 5.6 Selectores activos

`ListAccounts({ includeArchived: false })` (default) alimenta selects de create tx, transfer, goal link, recurring, pay card, etc. En `/accounts` se usa `includeArchived: true`: las archivadas quedan **al final del mismo listado** (por moneda), grisadas, con pill `warning` “Archivada” — no en una sección aparte.

## 6. Comandos y consultas

| Tipo | Nombre | Input | Output |
|------|--------|-------|--------|
| Command | `CreateAccount` | workspaceId, name, type, currency?, initialBalanceCents, creditLimitCents? | Account |
| Command | `UpdateAccount` | accountId, name?, creditLimitCents? | Account |
| Command | `ArchiveAccount` | accountId | Account |
| Command | `UnarchiveAccount` | accountId | Account |
| Command | `DeleteAccount` | accountId, **confirmName** (o token de confirmación UI) | void |
| Query | `ListAccounts` | workspaceId, includeArchived? | AccountWithBalance[] |
| Query | `GetAccount` | accountId | AccountWithBalance |

`confirmName` (o equivalente) se valida en action/UI; el **dominio puro** de guards no depende del copy — el service puede exigir que `confirmName.trim() === account.name` como precondición de aplicación.

## 7. Errores tipados (dominio)

| Error | Cuándo |
|-------|--------|
| `UnsupportedAccountCurrency` | currency ∉ {ARS, USD} |
| `InvalidAccountName` | nombre vacío / > 80 |
| `InvalidInitialBalance` | no entero ≥ 0 |
| `InvalidCreditLimit` | límite en tipo ≠ credit_card, o ≤ 0 / no entero |
| `AccountArchived` | mutación ledger sobre cuenta archivada |
| `AccountNotFound` | id inexistente / fuera de workspace |
| `AccountLinkedToActiveGoal` | archive o delete con Goal active linkeado |
| `CannotDeleteLastActiveAccount` | delete de la única cuenta no archivada |
| `AccountHasCrossWorkspaceLinks` | delete con txs ligadas cross-workspace |
| `AccountDeleteConfirmationMismatch` | confirmación UI no coincide (capa action; opcional en domain) |
| `Forbidden` | viewer (workspaces domain) |

## 8. Criterios de aceptación

- [ ] Saldo refleja income/expense/transfer/fx_* correctamente (tests).
- [ ] Cuenta archivada no acepta CreateTransaction.
- [ ] Currency no whitelisted → `UnsupportedAccountCurrency`.
- [ ] Cuenta USD en workspace ARS → OK.
- [ ] Create credit_card **sin** creditLimit → OK.
- [ ] Update name / creditLimit desde UI.
- [ ] Archive última activa → OK; `needsSetup` true para owner/admin (si no dismissed).
- [ ] Archive/Delete con Goal active linkeado → `AccountLinkedToActiveGoal`.
- [ ] Delete última activa → `CannotDeleteLastActiveAccount`.
- [ ] Delete con historial (sin guards) → cascada completa; cuenta y txs asociadas desaparecen; contraparte de transfer recalcula saldo.
- [ ] Delete con CrossWorkspaceLink → bloqueado.
- [ ] Member puede mutar; viewer no.
- [ ] UI: Archivar y Eliminar con copy distinto; Eliminar pide confirmación fuerte.

## 9. Escenarios de test (TDD)

**Prioridad implementación:**

| Prioridad | Escenarios | Capa |
|-----------|------------|------|
| P0 | T-20 guards puros; T-10/T-13/T-14 errores tipados; T-06 creditLimit null | domain unit |
| P0 | T-09 archive última → ready=false; T-15 delete archivada OK | domain + service |
| P1 | T-16/T-17 cascade historial + rules/goals; T-18 cross-ws block | service (tx) |
| P1 | T-07/T-08 update; T-11/T-12 archive goals/recurring; T-19 authz | service / authz |
| P2 | T-01…T-05 balances (ya existentes) | regresiones |

### Create / balance (existentes)

#### T-01 Crear y saldo inicial

- **Given** workspace ARS  
- **When** create checking ARS con 10_000 centavos  
- **Then** currentBalance = 10000 ARS

#### T-02 Currency no soportada

- **Given** workspace ARS  
- **When** create account EUR  
- **Then** error `UnsupportedAccountCurrency`

#### T-02b Cuenta USD en workspace ARS

- **Given** workspace ARS  
- **When** create account USD  
- **Then** account creada con currency=USD

#### T-03 Saldo tras expense

- **Given** account 10000  
- **When** expense 2500  
- **Then** balance 7500

#### T-04 Archivar bloquea txs

- **Given** account archived  
- **When** create expense  
- **Then** error `AccountArchived`

#### T-05 Credit card debt

- **Given** credit balance 0  
- **When** expense 5000 en la tarjeta  
- **Then** balance (deuda) = 5000

#### T-06 Create credit_card sin límite

- **Given** workspace ARS  
- **When** CreateAccount type=credit_card, creditLimitCents omitted/null  
- **Then** account creada con `creditLimitCents = null`

### Update

#### T-07 Update name

- **Given** account name "Banco"  
- **When** UpdateAccount name="Banco Nación"  
- **Then** name actualizado

#### T-08 Update creditLimit solo credit_card

- **Given** checking  
- **When** UpdateAccount creditLimitCents=100000  
- **Then** `InvalidCreditLimit`

### Archive / unarchive / última cuenta / goals

#### T-09 Archive última activa reabre setup (dominio ready)

- **Given** workspace con exactamente 1 cuenta no archivada  
- **When** ArchiveAccount  
- **Then** account.isArchived=true; `isWorkspaceReadyToUse({ accountCount: 0 })` = false  
- *(integración SPEC-15: needsSetup puede ser true para owner/admin)*

#### T-10 Archive bloqueado por goal activo

- **Given** Goal status=active, linkedAccountId=A  
- **When** ArchiveAccount(A)  
- **Then** error `AccountLinkedToActiveGoal`; isArchived sin cambio; recurrentes no pausadas

#### T-11 Archive OK con goal completed

- **Given** Goal status=completed, linkedAccountId=A  
- **When** ArchiveAccount(A)  
- **Then** A archivada; auto-pause recurrentes si aplica

#### T-12 Unarchive no reactiva recurrentes

- **Given** account archived; rule paused con `pausedReason=account_archived`  
- **When** UnarchiveAccount  
- **Then** account activa; rule sigue paused

### DeleteAccount

#### T-13 Delete bloqueado — última activa

- **Given** única cuenta no archivada A (con o sin txs)  
- **When** DeleteAccount(A)  
- **Then** `CannotDeleteLastActiveAccount`; A intacta

#### T-14 Delete bloqueado — goal activo

- **Given** A no es última activa; Goal active linked a A  
- **When** DeleteAccount(A)  
- **Then** `AccountLinkedToActiveGoal`

#### T-15 Delete OK — cuenta archivada sin txs

- **Given** A archivada, 0 txs, sin rules, sin goals active; existe otra cuenta activa B  
- **When** DeleteAccount(A)  
- **Then** A no existe

#### T-16 Delete con historial — cascade txs + efecto en contraparte

- **Given** cuentas A y B activas (B no se borra); transfer A→B 1000; A no es última activa (hay C) o A ya archivada y B+C activas  
- **When** DeleteAccount(A) con confirmación válida  
- **Then** A eliminada; transfer eliminada; balance de B ya no incluye esa transfer; GoalContribution asociada (si hubiera) revertida

#### T-17 Delete cascade — nullify goal completed + hard-delete recurring rules

- **Given** Goal completed linkedAccountId=A; RecurringRule (any status) con accountId=A; A no última activa / o archivada con otras activas  
- **When** DeleteAccount(A)  
- **Then** Goal.linkedAccountId = null; rules borradas; A borrada

#### T-18 Delete bloqueado — cross-workspace link

- **Given** expense en A con CrossWorkspaceLink  
- **When** DeleteAccount(A)  
- **Then** `AccountHasCrossWorkspaceLinks`; nada borrado

#### T-19 Authz member vs viewer

- **Given** member  
- **When** DeleteAccount / Archive / Update  
- **Then** permitido (si guards de negocio OK)  
- **Given** viewer  
- **When** misma mutación  
- **Then** `Forbidden`

### Guards puros (unit)

#### T-20 `assertCanArchiveAccount` / `assertCanDeleteAccount`

Cubrir combinaciones: linked active goal, last active (solo delete), cross-ws flag (solo delete), cuenta ya archivada (archive idempotent / delete allowed if not last active among non-archived — si está archivada no cuenta como activa).

## 10. Contratos de dominio (puro)

Ubicación: `src/features/accounts/domain/` — sin Next/React/Prisma.

```ts
// errors.ts — nuevos
export class AccountLinkedToActiveGoalError extends AccountDomainError {}
export class CannotDeleteLastActiveAccountError extends AccountDomainError {}
export class AccountHasCrossWorkspaceLinksError extends AccountDomainError {}
export class AccountDeleteConfirmationMismatchError extends AccountDomainError {}

// guards.ts — firmas propuestas
export function assertCanArchiveAccount(input: {
  readonly accountId: string
  readonly activeGoalsLinkedToAccount: ReadonlyArray<{ readonly id: string }>
}): void

export function assertCanDeleteAccount(input: {
  readonly accountId: string
  readonly isArchived: boolean
  readonly activeAccountCountInWorkspace: number // count where !isArchived
  readonly activeGoalsLinkedToAccount: ReadonlyArray<{ readonly id: string }>
  readonly hasCrossWorkspaceLinks: boolean
}): void

/** UI/action helper — optional in domain */
export function assertDeleteAccountConfirmation(input: {
  readonly accountName: string
  readonly confirmName: string
}): void

// Ya existentes (sin cambio de contrato):
// assertValidAccountName, assertValidInitialBalance, assertValidCreditLimit (null OK),
// assertAccountCurrencyAllowed, assertAccountAcceptsTransactions,
// assertCanMutateAccounts, calculateAccountBalance
```

**Reglas de `assertCanDeleteAccount`:**

- Si `activeGoalsLinkedToAccount.length > 0` → `AccountLinkedToActiveGoal`.
- Si `!isArchived && activeAccountCountInWorkspace === 1` → `CannotDeleteLastActiveAccount`.
- Si `hasCrossWorkspaceLinks` → `AccountHasCrossWorkspaceLinks`.

**Reglas de `assertCanArchiveAccount`:**

- Si `activeGoalsLinkedToAccount.length > 0` → `AccountLinkedToActiveGoal`.
- (No bloquea última activa.)

### Qué va en `services/` (no dominio)

| Service | Responsabilidad |
|---------|-----------------|
| `createAccount` / `updateAccount` | Authz, guards nombre/límite/currency, Prisma write |
| `archiveAccount` | Authz → cargar goals activos linkeados → `assertCanArchiveAccount` → auto-pause recurring (SPEC-18) → `isArchived=true` |
| `unarchiveAccount` | Authz → `isArchived=false` (sin reactivar rules) |
| `deleteAccount` | Authz → cargar contexto (counts, goals, cross-ws, confirm) → `assertCanDeleteAccount` (+ confirm) → **tx Prisma** orden §5.5 (incluye undo GoalContribution vía helper compartido con delete-tx si existe) |
| `listAccounts` / `getAccount` | Queries; default sin archivadas |

Orquestación de cascada, Prisma `onDelete: Restrict`, y revalidación de paths: **solo service**.

## 11. UI / copy (handoff ui-ux)

- `/accounts`: editar (nombre; límite si credit_card); menú o acciones **Archivar** / **Desarchivar** / **Eliminar permanentemente**.
- Create form: creditLimit **opcional** (placeholder “Opcional”).
- Eliminar: diálogo con consecuencias (“Se borrarán movimientos de esta cuenta, incluidas transferencias con otras cuentas”) + input de confirmación (nombre exacto).
- Si guard `AccountLinkedToActiveGoal`: mensaje orientando a cancelar/completar o desvincular el objetivo (desvincular en v1 = cancelar goal o esperar; no hay UnlinkGoal dedicado salvo que SPEC-08 lo agregue — copy: “Cancelá o completá el objetivo vinculado”).
- Si `CannotDeleteLastActiveAccount`: sugerir archivar o crear otra cuenta antes.
- Tras archivar última: owner/admin pueden caer en `/onboarding` por gate SPEC-15.

## 12. Fuera de alcance

- Conciliación bancaria
- Canje ARS↔USD → [SPEC-16](./16-currency-exchange.md)
- Cuentas de inversión
- Monedas fuera de ARS\|USD
- Cambiar currency de una cuenta con historial
- Soft-delete de txs individuales (sigue SPEC-05)
- Unlink de Goal sin cancelar (SPEC-08)
- Cascade automático a txs del **otro** workspace (SPEC-14): se **bloquea** delete

## 13. Notas

- `calculateAccountBalance(account, transactions)` puro y testeable.
- Transferencias same-currency: [SPEC-06](./06-transfers.md). Canje: [SPEC-16](./16-currency-exchange.md).
- Onboarding / `needsSetup`: [SPEC-15](./15-workspace-onboarding.md) — `accountCount` = no archivadas.
- Auto-pause recurrentes: [SPEC-18](./18-recurring-transactions.md) §4.7; hard-delete de rules solo vía §5.5 de esta spec.
- Hoy en código: Archive/Unarchive/Update services existen; **DeleteAccount no**. Update sin UI completa.

## 14. Hand-off implementación

### software-engineer (orden TDD)

1. Tests dominio: `assertCanArchiveAccount`, `assertCanDeleteAccount`, `assertDeleteAccountConfirmation`, T-06 creditLimit opcional (si no cubierto).
2. Errores + guards en `src/features/accounts/domain/`.
3. Extender `archiveAccount` service con guard de goal activo **antes** de auto-pause.
4. `deleteAccount` service + action + schema Zod (`confirmName`).
5. Reutilizar undo de GoalContribution / delete-tx si ya existe; si no, extraer helper de dominio+service.
6. Authz member OK / viewer Forbidden (tests authz existentes).
7. No cambiar Prisma `onDelete` a Cascade global — cascada explícita en service mantiene control y undo de goals.

### ui-ux-developer

1. Edit account sheet/page (name + creditLimit opcional).
2. creditLimit opcional en create.
3. Acciones Archivar / Desarchivar / Eliminar con copy y confirmación fuerte.
4. Empty / redirect coherente con SPEC-15 tras archivar última.
5. Mensajes de error tipados → strings ES.

**Listo para hand-off a `software-engineer` y `ui-ux-developer`.**
