# Spec 22 — Ajuste de saldo (KRI-36)

| Campo | Valor |
|-------|-------|
| ID | SPEC-22 |
| Estado | Ready (diseño de dominio) |
| Prioridad | P1 |
| Dependencias | SPEC-03, SPEC-05 |
| Relacionadas | SPEC-07, SPEC-11, SPEC-12, SPEC-13, SPEC-16, SPEC-18 |
| Issue | Linear **KRI-36** |

## 1. Contexto

El saldo de una cuenta es **derivado**: `initialBalance + Σ efectos de transacciones` ([domain-model](../domain-model.md), SPEC-03 FR-03). No se edita `initialBalance` ni un campo `currentBalance` a mano.

El usuario necesita **corregir el saldo mostrado** para que coincida con el extracto (redondeos, movimientos omitidos, saldo inicial mal cargado) **sin** registrar un ingreso/gasto falso que distorsione presupuestos, cashflow ni analytics.

El formulario de producto es **un** tab **Ajuste**: el usuario elige cuenta y carga el **saldo (o deuda) objetivo**. El dominio calcula el delta y persiste **una** `Transaction` de ledger. No hay conciliación bancaria ni import de extracto en este alcance.

## 2. Decisión de modelado (enum)

| Enfoque | Cómo persiste la dirección | Decisión |
|---------|----------------------------|----------|
| A — Un `type=adjustment` + columna `direction` | Columna extra | Rechazado: invasivo vs invariante actual |
| B — Un `type=adjustment` + `amountCents` con signo | Viola ADR-001 / `amountCents > 0` | Rechazado |
| C — Un `type=adjustment` sin dirección persistida | Imposible: el saldo futuro cambia; hay que releer el efecto | Rechazado |
| **D — `adjustment_credit` / `adjustment_debit`** | Dirección = `type` (igual que `fx_credit` / `fx_debit`) | **Elegido** |

**Por qué D:** el ledger ya expresa dirección con `type` y `amountCents` siempre > 0. Un solo valor `adjustment` **no** puede persistir crédito vs débito sin columna extra o monto firmado. Dos valores son el mínimo alineado a SPEC-16.

**Mapeo de polaridad** (idéntico a income/fx_credit vs expense/fx_debit):

| `type` | Cuenta asset | `credit_card` (deuda) |
|--------|--------------|------------------------|
| `adjustment_credit` | +saldo | −deuda |
| `adjustment_debit` | −saldo | +deuda |

El usuario **no** elige crédito/débito: elige `targetBalanceCents`. El dominio deriva `ledgerType` + `amountCents`.

`RecurringRule.type` comparte el enum Prisma `TransactionType`. En MVP **no** hay plantillas de ajuste (igual que `fx_*`): el dominio de recurrentes sigue restringido a `income` \| `expense` \| `transfer` (SPEC-18).

## 3. Actores

- Owner, Admin, Member: pueden crear / editar (vía comando de target) / borrar ajustes — misma authz que `CreateExpense` (`assertCanMutateTransactions`).
- Viewer: solo lectura.

## 4. Historias de usuario

1. Como member, quiero indicar el saldo real de una cuenta (p. ej. lo que muestra el banco) para que Finance Hub quede alineado **sin** inventar un gasto o un ingreso.
2. Como member, quiero ajustar la **deuda** de una tarjeta al valor del resumen, para corregir sin afectar el presupuesto.
3. Como member, quiero ver el ajuste en el historial de Transacciones (`type=all`) para auditar quién/cuándo corrigió el saldo.
4. Como member, no quiero que un ajuste inflé “gastos del mes”, presupuestos ni el cashflow del dashboard.
5. Como viewer, no quiero poder ajustar saldos.

## 5. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Comando `CreateBalanceAdjustment`: cuenta + saldo/deuda objetivo + fecha + descripción opcional |
| FR-02 | Persistir **una** `Transaction` con `type ∈ { adjustment_credit, adjustment_debit }`, `amountCents > 0`, `categoryId = null`, `counterpartyAccountId = null`, `currency = account.currency` |
| FR-03 | El efecto entra en `calculateAccountBalance`; tras el alta, `currentBalance = target` (misma convención de signo que SPEC-03) |
| FR-04 | Ajustes **no** cuentan en budget spent, cashflow del dashboard, analytics de gasto/ingreso, ni en `presentListTotals` income/expense/net / `movementCount` de `type=all` |
| FR-05 | Listado: `type=all` **incluye** ajustes; `type=expense` / `income` / `transfer` **no**. Sin filtro URL dedicado en MVP (igual que `fx_*`) |
| FR-06 | Cuenta archivada → `AccountArchived`. Viewer → `Forbidden` |
| FR-07 | `occurredOn` con la misma regla que `CreateExpense` (no futuro > hoy+1 día, timezone del user) |
| FR-08 | `DeleteTransaction` de un ajuste restaura el saldo derivado (no hay agregado extra) |
| FR-09 | Re-apuntar el objetivo: `UpdateBalanceAdjustment` (recalcula delta **excluyendo** esta tx). `UpdateTransaction` genérico no muta monto/cuenta/tipo de un ajuste |
| FR-10 | No hay `RecurringRule` de ajuste en MVP |

## 6. Reglas de negocio

### 6.1 Target vs saldo derivado

- `currentBalanceCents` = resultado de `calculateAccountBalance` (entero; puede ser negativo en cuentas asset por sobregiro).
- `targetBalanceCents` = entero seguro (`Number.isSafeInteger`). **Puede ser 0.**
- **Cuentas asset** (`checking`, `savings`, `cash`, `virtual_wallet`, `other`): target **puede ser negativo** (sobregiro). `initialBalance` al crear sigue ≥ 0 (SPEC-03); el target del ajuste no está atado a esa guard.
- **`credit_card`:** el número es **deuda** (positivo = adeudado). Target **≥ 0**. `0` = tarjeta saldada. Target **< 0** (crédito a favor) → `InvalidTargetBalance`. No se introduce “saldo a favor” por este comando; la convención de SPEC-03 §5.2 se mantiene.
- `target === current` → `NoAdjustmentNeeded` (no persistir `amountCents = 0`).
- `currency` del movimiento = `account.currency`. Si el comando envía `currency` y no coincide → `TransactionCurrencyMismatchError`.

### 6.2 Cálculo del delta (puro)

```
signedEffect = targetBalanceCents − currentBalanceCents
amountCents  = |signedEffect|          // siempre > 0 si no hay NoAdjustmentNeeded
```

Tras persistir, `calculateAccountBalance` debe aplicar exactamente `signedEffect` sobre el saldo almacenado (el número de deuda/saldo).

| Cuenta | `signedEffect` | `ledgerType` | Ejemplo |
|--------|----------------|--------------|---------|
| asset | +N | `adjustment_credit` | 10_000 → 12_000 |
| asset | −N | `adjustment_debit` | 10_000 → 7_000 |
| credit_card | −N (baja deuda) | `adjustment_credit` | deuda 8_000 → 5_000 |
| credit_card | +N (sube deuda) | `adjustment_debit` | deuda 8_000 → 11_000 |

Ejemplo KRI-36: deuda actual 8_000, target 5_000 → `signedEffect = −3000` → `adjustment_credit` / `amountCents = 3000` (misma polaridad que `income` / `fx_credit` en tarjeta).

### 6.3 Invariantes de la `Transaction` de ajuste

- `amountCents` entero > 0 (ADR-001).
- `categoryId = null` (como transfer / `fx_*`).
- `counterpartyAccountId = null` (una sola cuenta).
- `recurringRuleId = null`, `scheduledOn = null`.
- Sin `ExpenseSplit`, sin `GoalContribution`, sin `CurrencyExchange`.
- `type` inmutable.
- Cuenta del mismo workspace; activa en el **alta** y al **cambiar objetivo**.

### 6.4 Listado, totales, dashboard, budgets

| Superficie | ¿Incluye ajuste? |
|------------|------------------|
| `ListTransactions` `type=all` | Sí |
| `type=income` \| `expense` \| `transfer` | No |
| Filtro `categoryId` | No (categoría null) |
| Filtro `accountId` | Sí, match en `accountId` |
| `summarizeListAmounts` buckets income/expense/transfer/fx | No |
| `presentListTotals` (`all` / income / expense / transfer) | No: ni montos ni `movementCount` |
| `computeBudgetSpent` | No (solo `type === "expense"`) |
| `computeMonthlyCashflow` / analytics cashflow | No |
| `selectRecentTransactions` | Sí (es un movimiento de ledger) |
| `calculateAccountBalance` / patrimonio del dashboard | Sí |

URL `type=adjustment_credit` (u otro no permitido) se normaliza a `all` (SPEC-05 T-19).

### 6.5 Update / delete

- **Delete:** `DeleteTransaction` existente. Cascada de cuenta (SPEC-03 §5.5) borra ajustes como cualquier tx de esa cuenta. No hay par FX ni contribución a goal que deshacer.
- **Update genérico (`UpdateTransaction`):** solo `description` y `occurredOn`. Mutar `amountCents`, `accountId`, `categoryId`, `counterpartyAccountId` o `type` → `AdjustmentLedgerFieldsImmutable`.
- **Update de objetivo (`UpdateBalanceAdjustment`):** nuevo `targetBalanceCents` contra el saldo derivado **sin esta tx**; puede cambiar `type` entre `adjustment_credit` ↔ `adjustment_debit` y el `amountCents`. La cuenta no se cambia (borrar + crear).
- Mover el ajuste a otra cuenta: delete + create.

### 6.6 Recurrentes

Crear/editar `RecurringRule` con `type` de ajuste → error de dominio de recurrentes (el subconjunto permitido no cambia). No hay materialización de ajustes.

## 7. Comandos y consultas

| Tipo | Nombre | Input | Output |
|------|--------|-------|--------|
| Command | `CreateBalanceAdjustment` | `accountId`, `targetBalanceCents`, `occurredOn`, `description?`, `currency?` | `Transaction` (`adjustment_*`) |
| Command | `UpdateBalanceAdjustment` | `transactionId`, `targetBalanceCents`, `occurredOn?`, `description?` | `Transaction` |
| Command | `DeleteTransaction` | (existente, SPEC-05) | void |
| Query | `ListTransactions` / `GetTransaction` | (existente; `type=all` lista ajustes) | — |

No hay query nueva: el saldo objetivo de alta es input de UI; el saldo actual lo resuelve el service con `calculateAccountBalance`.

## 8. Errores tipados

| Error | Cuándo | Capa |
|-------|--------|------|
| `NoAdjustmentNeeded` | `target === current` | accounts domain (`computeBalanceAdjustment`) |
| `InvalidTargetBalance` | target/current no entero seguro; o `credit_card` y target < 0 | accounts domain |
| `AccountArchived` | cuenta archivada en create / update de objetivo | transactions (existente) |
| `AccountNotFound` / mismatch workspace | cuenta inexistente o de otro tenant | service + guards existentes |
| `OccurredOnTooFuture` / `InvalidOccurredOn` | misma regla que CreateExpense | transactions (existente) |
| `TransactionCurrencyMismatchError` | `currency` enviada ≠ `account.currency` | transactions (existente) |
| `AdjustmentLedgerFieldsImmutable` | `UpdateTransaction` intenta cambiar monto/cuenta/categoría/contraparte/tipo de un ajuste | transactions domain |
| `TransactionNotFound` | id inválido / no es ajuste (en `UpdateBalanceAdjustment`) | transactions |
| `Forbidden` | viewer | authz existente |

`InvalidAmount` no se usa en el comando de target: un delta 0 es `NoAdjustmentNeeded`; el `amountCents` persistido lo deriva el dominio y siempre es > 0.

## 9. Criterios de aceptación

- [ ] Checking 10_000 → target 12_000: tx `adjustment_credit` 2_000; saldo 12_000.
- [ ] Credit card deuda 8_000 → target 5_000: tx `adjustment_credit` 3_000; deuda 5_000.
- [ ] Target = current → `NoAdjustmentNeeded`; no hay fila nueva.
- [ ] Credit card target −1 → `InvalidTargetBalance`.
- [ ] Asset target 0 y target negativo (sobregiro) permitidos.
- [ ] Cuenta archivada → `AccountArchived`.
- [ ] Viewer → `Forbidden`.
- [ ] Budget spent y cashflow **sin** cambio; listado `type=all` muestra el ajuste; `type=expense` no.
- [ ] `presentListTotals(..., "all")` no suma el ajuste a income/expense/net ni al recuento.
- [ ] Delete restaura el saldo previo.
- [ ] Sin categoría ni contraparte; currency = cuenta.
- [ ] No se puede crear `RecurringRule` de ajuste.

## 10. Escenarios de test (TDD)

**Prioridad:** P0 = `computeBalanceAdjustment` + polaridad en `calculateAccountBalance` + exclusiones de list/budget/cashflow. P1 = comando/guards, update/delete, authz.

### Cálculo puro — `computeBalanceAdjustment`

#### T-01 Asset: subir saldo → credit

- **Given** `accountType=checking`, `currentBalanceCents=10_000`, `targetBalanceCents=12_000`
- **When** `computeBalanceAdjustment`
- **Then** `{ amountCents: 2000, ledgerType: "adjustment_credit", signedEffect: 2000 }`

#### T-02 Asset: bajar saldo → debit

- **Given** checking 10_000 → target 7_000
- **Then** `{ amountCents: 3000, ledgerType: "adjustment_debit", signedEffect: -3000 }`

#### T-03 Asset: target 0

- **Given** checking 4_500 → target 0
- **Then** `{ amountCents: 4500, ledgerType: "adjustment_debit", signedEffect: -4500 }`

#### T-04 Asset: target negativo (sobregiro)

- **Given** checking 1_000 → target −500
- **Then** `{ amountCents: 1500, ledgerType: "adjustment_debit", signedEffect: -1500 }`

#### T-05 Asset: desde sobregiro hacia positivo

- **Given** checking −200 → target 300
- **Then** `{ amountCents: 500, ledgerType: "adjustment_credit", signedEffect: 500 }`

#### T-06 Credit card: bajar deuda (ejemplo producto)

- **Given** `accountType=credit_card`, current 8_000, target 5_000
- **Then** `{ amountCents: 3000, ledgerType: "adjustment_credit", signedEffect: -3000 }`

#### T-07 Credit card: subir deuda

- **Given** credit_card 8_000 → target 11_000
- **Then** `{ amountCents: 3000, ledgerType: "adjustment_debit", signedEffect: 3000 }`

#### T-08 Credit card: saldar (target 0)

- **Given** credit_card 8_000 → target 0
- **Then** `{ amountCents: 8000, ledgerType: "adjustment_credit", signedEffect: -8000 }`

#### T-09 Credit card: target negativo rechazado

- **Given** credit_card current 1_000, target −1
- **Then** error `InvalidTargetBalance`

#### T-10 Credit card: ya en 0, target 0

- **Given** credit_card 0 → 0
- **Then** error `NoAdjustmentNeeded`

#### T-11 NoAdjustmentNeeded (asset)

- **Given** checking 10_000 → 10_000
- **Then** error `NoAdjustmentNeeded`

#### T-12 InvalidTargetBalance — no entero

- **Given** target `10.5` o `NaN` o `Infinity` o no `Number.isSafeInteger`
- **Then** error `InvalidTargetBalance`
- **Given** `currentBalanceCents` no entero seguro
- **Then** el mismo error (el calculador no adivina)

### Polaridad en `calculateAccountBalance` (SPEC-03)

#### T-13 Asset: credit suma, debit resta

- **Given** checking initial 10_000
- **When** `adjustment_credit` 2_000
- **Then** balance 12_000
- **When** en su lugar `adjustment_debit` 2_000
- **Then** balance 8_000

#### T-14 Credit card: credit baja deuda, debit la sube

- **Given** credit_card initial 8_000
- **When** `adjustment_credit` 3_000
- **Then** deuda 5_000
- **When** `adjustment_debit` 3_000
- **Then** deuda 11_000

#### T-15 Cierre del ciclo create (composición)

- **Given** account + txs actuales con `current = C`
- **When** se aplica el resultado de `computeBalanceAdjustment({ current, target, accountType })` como `BalanceEffectTx`
- **Then** `calculateAccountBalance` = `target`

### Comando / guards (domain + orquestación)

#### T-16 Cuenta archivada

- **Given** account `isArchived=true`
- **When** `CreateBalanceAdjustment`
- **Then** `AccountArchived`; sin tx

#### T-17 occurredOn futuro

- **Given** `occurredOn` > hoy + 1 día (timezone usuario)
- **When** Create
- **Then** `OccurredOnTooFuture`

#### T-18 Currency mismatch

- **Given** cuenta ARS, comando `currency=USD`
- **Then** `TransactionCurrencyMismatchError`

#### T-19 Persistencia de forma

- **Given** create OK
- **Then** `categoryId=null`, `counterpartyAccountId=null`, `currency=account.currency`, `amountCents>0`, `type` ∈ {`adjustment_credit`,`adjustment_debit`}, `recurringRuleId=null`

#### T-20 Authz

- **Given** member → Create/Update/Delete permitido
- **Given** viewer → `Forbidden`

#### T-21 Delete restaura saldo

- **Given** ajuste que llevó el saldo de 10_000 a 12_000
- **When** `DeleteTransaction`
- **Then** saldo 10_000; tx no listada

#### T-22 UpdateTransaction no muta ledger del ajuste

- **Given** tx `adjustment_credit`
- **When** `UpdateTransaction` con nuevo `amountCents` o `accountId`
- **Then** `AdjustmentLedgerFieldsImmutable`
- **When** solo `description` / `occurredOn`
- **Then** OK

#### T-23 UpdateBalanceAdjustment recalcula

- **Given** checking quedó en 12_000 por un credit de 2_000 (antes 10_000)
- **When** `UpdateBalanceAdjustment` target=9_000 (saldo sin esta tx = 10_000)
- **Then** tx pasa a `adjustment_debit` 1_000; saldo 9_000

#### T-24 UpdateBalanceAdjustment sobre no-ajuste

- **Given** tx `expense`
- **When** `UpdateBalanceAdjustment`
- **Then** error (`TransactionNotFound` o error de tipo: no es ajuste)

### Exclusiones (list / totals / budget / cashflow)

#### T-25 Filtro de listado

- **Given** expense, income, transfer, `fx_debit`, `adjustment_credit` en rango
- **When** `type=all` → el ajuste se lista
- **When** `type=expense` → el ajuste **no** se lista
- **When** `type=income` o `type=transfer` → el ajuste **no** se lista
- **When** URL `type=adjustment_credit` → se normaliza a `all` (sin predicado)

#### T-26 `categoryId` excluye ajustes

- **Given** expense con cat X y un ajuste (categoría null)
- **When** filtro `categoryId=X`
- **Then** solo el expense

#### T-27 Totales `type=all` (extiende SPEC-05 T-20b)

- **Given** income 10_000, expense 3_000, `adjustment_debit` 500 (misma moneda)
- **When** `presentListTotals(..., "all")`
- **Then** income=10000, expense=3000, net=7000; `movementCount=2` (sin el ajuste)

- **Given** solo ajustes en el filtro y `type=all`
- **Then** breakdown vacío (no fallback a SUMA de ajustes)

#### T-28 Budget spent

- **Given** budget comida; `adjustment_debit` en el periodo (con o sin categoría)
- **When** `computeBudgetSpent`
- **Then** spent sin cambio

#### T-29 Cashflow dashboard

- **Given** `adjustment_credit` y `adjustment_debit` este mes
- **When** `computeMonthlyCashflow`
- **Then** income/expense/net **sin** esos montos

#### T-30 Recientes del dashboard

- **Given** un ajuste entre las últimas txs
- **When** `selectRecentTransactions`
- **Then** el ajuste **puede** aparecer (no se filtra por tipo)

## 11. Contratos de dominio (puro)

### 11.1 Cálculo — `src/features/accounts/domain/`

Vive junto a `calculateAccountBalance`: la polaridad es invariante de **cuenta**, no de listado.

```ts
// src/features/accounts/domain/balance-adjustment.ts

export const ADJUSTMENT_LEDGER_TYPES = [
  "adjustment_credit",
  "adjustment_debit",
] as const;

export type AdjustmentLedgerType = (typeof ADJUSTMENT_LEDGER_TYPES)[number];

export type ComputeBalanceAdjustmentInput = {
  readonly currentBalanceCents: number;
  readonly targetBalanceCents: number;
  readonly accountType: AccountType;
};

export type BalanceAdjustmentPlan = {
  readonly amountCents: number; // > 0
  readonly ledgerType: AdjustmentLedgerType;
  readonly signedEffect: number; // target − current; ≠ 0
};

export function computeBalanceAdjustment(
  input: ComputeBalanceAdjustmentInput,
): BalanceAdjustmentPlan
```

Errores (cuentas domain, para no mezclar con Prisma):

```ts
export class NoAdjustmentNeededError extends AccountDomainError {}
export class InvalidTargetBalanceError extends AccountDomainError {}
```

`calculateAccountBalance` / `BalanceEffectTx.type` se extienden:

- `adjustment_credit` ≡ `income` ≡ `fx_credit`
- `adjustment_debit` ≡ `expense` ≡ `fx_debit`

### 11.2 Ledger / comando — `src/features/transactions/domain/`

```ts
// types.ts — TRANSACTION_TYPES incluye adjustment_credit | adjustment_debit
// CREATEABLE_TRANSACTION_TYPES NO los incluye (el alta de producto es el comando de target)
// TRANSACTION_TYPE_TO_CATEGORY_KIND[adjustment_*] = null

export type CreateBalanceAdjustmentInput = {
  readonly accountId: string;
  readonly targetBalanceCents: number;
  readonly occurredOn: Date;
  readonly description?: string | null;
  readonly currency?: string; // opcional; si viene, = account.currency
};

export type CreateBalanceAdjustmentResult = {
  readonly type: AdjustmentLedgerType;
  readonly amountCents: number;
  readonly currency: string;
  readonly categoryId: null;
  readonly counterpartyAccountId: null;
  readonly accountId: string;
  readonly signedEffect: number;
};

/** Arma el snapshot a persistir. No hace I/O. */
export function planCreateBalanceAdjustment(input: {
  readonly account: {
    readonly id: string;
    readonly type: AccountType;
    readonly currency: string;
    readonly isArchived: boolean;
    readonly workspaceId: string;
  };
  readonly currentBalanceCents: number;
  readonly targetBalanceCents: number;
  readonly occurredOn: Date;
  readonly now: Date;
  readonly timezone: string;
  readonly description?: string | null;
  readonly currency?: string;
  readonly workspaceId: string;
}): CreateBalanceAdjustmentResult

export function assertAdjustmentLedgerFieldsImmutable(input: {
  readonly type: TransactionType;
  readonly mutatingLedgerFields: boolean;
}): void

export function isAdjustmentType(
  type: TransactionType,
): type is AdjustmentLedgerType
```

Guards reutilizados (ya existen): `assertAccountActive`, `assertOccurredOnNotTooFuture`, `assertTransactionCurrencyMatchesAccount`, `assertAccountBelongsToWorkspace`, `assertCategoryRequiredForType` (ajuste = categoría prohibida, como `fx_*`), `assertTransferCounterparty` (ajuste = sin contraparte), `assertCanMutateTransactions`, `normalizeDescription`.

`planCreateBalanceAdjustment` (o el service si se prefiere orquestar a mano) debe:

1. `assertAccountActive`
2. workspace match
3. currency
4. `assertOccurredOnNotTooFuture`
5. `computeBalanceAdjustment`
6. `normalizeDescription`
7. devolver snapshot con `categoryId/counterparty = null`

### 11.3 Qué **no** va en domain

| Capa | Responsabilidad |
|------|-----------------|
| `accounts/services` | Cargar cuenta + txs; `calculateAccountBalance` para obtener `current` |
| `transactions/services` | Authz, Prisma insert/update/delete, `revalidateMoneyPaths` |
| `actions` | `getSession` + Zod (`targetBalanceCents` entero; parseo de UI vía `parse-amount`) |
| UI | Un tab Ajuste; copy “Saldo objetivo” vs “Deuda objetivo” si `credit_card`; **no** calcular el `type` |

## 12. Impacto en código existente (hand-off)

| Módulo | Cambio |
|--------|--------|
| `prisma/schema.prisma` `TransactionType` | Agregar `adjustment_credit`, `adjustment_debit` (migración `ALTER TYPE ... ADD VALUE`) |
| `RecurringRule.type` | Mismo enum Prisma; domain SPEC-18 **sigue** sin aceptarlos |
| `accounts/domain/balance.ts` | Polaridad; tests T-13…T-15 |
| `transactions/domain/types.ts` | Union + category kind null |
| `transactions/domain/guards.ts` | `fx_*` \| `adjustment_*` sin categoría ni contraparte |
| `transactions/domain/list-filters.ts` | `all` incluye ajustes (predicado `undefined`); income/expense/transfer estrictos |
| `transactions/domain/list-totals.ts` | No bucketizar ajustes como income/expense; `presentListTotals` los ignora (como `fx_*` / transfer en `all`) |
| `transactions/domain/ledger-amount.ts` | credit → +, debit → − |
| `budgets/domain/types.ts` | Ampliar union de `type` para que compile; `computeBudgetSpent` sigue filtrando `expense` |
| `dashboard/domain/cashflow.ts` | Comentario + test T-29; el `if` actual ya los ignora si no son income/expense |
| `dashboard/domain/analytics.ts` | Igual: solo income/expense |
| `DeleteAccount` cascada | Sin cambio de algoritmo: las txs de ajuste se borran en el paso de transactions |
| `UpdateTransaction` | Guard `assertAdjustmentLedgerFieldsImmutable` |

## 13. Impacto en docs (esta entrega)

Actualizar junto con esta spec: SPEC-03, SPEC-05, SPEC-07, SPEC-11, SPEC-12, SPEC-13, SPEC-18, `domain-model.md`, `glossary.md`, `docs/README.md`.

## 14. UI / copy (handoff ui-ux — no implementar aquí)

- Tab único **Ajuste** en el FormSheet de alta (junto a gasto/ingreso/transfer/canje). No dos tabs crédito/débito.
- Campos: cuenta (activas), monto objetivo (`parse-amount`, coma decimal), fecha, descripción opcional.
- `credit_card`: label **Deuda objetivo**; resto **Saldo objetivo**. Mostrar saldo/deuda actual como contexto (dato del server, no estimado en cliente).
- Listado: label “Ajuste” para ambos `type` (el signo del monto / color sigue `signedLedgerAmountCents`).
- Detalle: sin categoría; acciones editar fecha/descripción o “cambiar objetivo”; eliminar con confirmación estándar.
- No atajo PWA obligatorio en MVP (`?new=adjustment` opcional later).

## 15. Fuera de alcance

- Conciliación bancaria / import OFX/CSV / matching de extracto
- Editar `initialBalance` a posteriori
- Crédito a favor en `credit_card` (target < 0)
- Ajuste multi-cuenta o que mueva liquidez de otra cuenta (eso es transfer / pago de tarjeta)
- Recurrentes de ajuste
- Filtro URL `type=adjustment`
- Soft-delete de la tx
- Ajuste que cuente como income/expense “oculto” para el usuario (explícitamente no)
- Clamp de deuda de tarjeta en transfers existentes (gap previo: un pago mayor a la deuda puede dejar `currentBalance < 0`; este comando **no** lo usa como precedente)

## 16. Alternativas rechazadas

| Alternativa | Motivo |
|-------------|--------|
| Un enum `adjustment` + columna `direction` | Schema extra; el ledger ya usa `type` como dirección |
| Reusar `income` / `expense` | Contaminaría budget, cashflow, analytics y totales |
| Reusar `fx_credit` / `fx_debit` sin `CurrencyExchange` | Rompe invariantes de SPEC-16 y el copy “Cambio” |
| Mutar `initialBalance` | Reescribe historia; el domain-model exige ajuste **explícito** como movimiento |
| Result monad en vez de throw | El resto del domain lanza errores tipados |

## 17. Hand-off implementación

**Listo para hand-off a `software-engineer`.**

1. Tests red: `computeBalanceAdjustment` (T-01…T-12) en `accounts/domain/balance-adjustment.test.ts`.
2. Green: función + errores en `accounts/domain`.
3. Tests + polaridad en `balance.test.ts` (T-13…T-15) y extensión de `BalanceEffectTx`.
4. Extender `TRANSACTION_TYPES`, guards, list-filters, list-totals, ledger-amount + tests T-25…T-27.
5. Tests budget T-28 y cashflow T-29 (fakes; el filtro `type==="expense"` / `==="income"` ya excluye si el union se amplia).
6. Prisma enum + generate.
7. `planCreateBalanceAdjustment` + service/action Zod + authz (T-16…T-20).
8. `UpdateBalanceAdjustment` + guard en `UpdateTransaction` (T-22…T-24); delete existente (T-21).
9. Guard recurring: rechazar tipos de ajuste si el enum Prisma se comparte.
10. UI después (ui-ux): tab Ajuste; sin lógica de polaridad en el cliente.

Authz Zod/session: requisito de capa, no de este diseño.
