# Spec 23 — Pantalla core de registro de movimiento

| Campo | Valor |
|-------|-------|
| ID | SPEC-23 |
| Estado | Implementado |
| Prioridad | P0 |
| Dependencias | SPEC-03, SPEC-04, SPEC-05, SPEC-06, SPEC-18, SPEC-22 |
| Relacionadas | SPEC-10, SPEC-12, SPEC-13 |
| Issue | — |

## 1. Contexto

El alta de movimientos estaba repartida entre un **FormSheet global** (montado en `AppShell`) y una ruta dedicada `/transactions/new`. El caso de uso más frecuente del producto — *cargar un gasto rápido* — competía con selects, steppers y formularios largos.

Esta spec convierte el **alta de movimientos en la superficie central** de Finance Hub: una **pantalla dedicada full-screen** en `/new`, con monto grande y teclado primero, cuentas como tarjetas, categorías en grilla, frecuencia y **gasto grupal ad-hoc**. El sheet global y `/transactions/new` dejan de usarse (este último redirige a `/new`).

La spec original de producto (`NewTransactionScreen`) asumía un modelo CLP sin centavos. **Se adapta** al dominio real del repo: dinero en **centavos enteros** (ADR-001), multi-moneda **ARS/USD** (ADR-006) y `RecurringRule` real (SPEC-18).

## 2. Alcance

- Una ruta `GET /new` que renderiza la pantalla core.
- Tipos: **gasto, ingreso, transferencia, ajuste** (ajuste reutiliza SPEC-22).
- Monto, cuenta(s), categoría, fecha, nota, **frecuencia** y **gasto grupal**.
- Frecuencia ≠ `once` ⇒ se crea una `RecurringRule` real junto con el movimiento.
- Gasto grupal ⇒ se persiste un `TransactionGroupSplit` (nuevo modelo ad-hoc, **no** `ExpenseSplit`).
- Reapuntar los CTA existentes (sidebar, tab bar mobile, botones de dashboard/empty state) a `/new`.

Fuera de alcance: rediseño del detalle, edición desde la pantalla core, contactos reales para el split, FX desde la pantalla core.

## 3. Historias de usuario

1. Como member, quiero cargar un gasto en segundos (monto → cuenta → categoría → listo).
2. Como member, quiero elegir el tipo al toque con una fila de tabs (gasto/ingreso/transferencia/ajuste).
3. Como member, quiero elegir la cuenta viendo su saldo, sin abrir un select.
4. Como member, quiero marcar un gasto como **grupal** y repartirlo entre personas escribiendo sus nombres, sin crear antes un grupo.
5. Como member, quiero que un gasto/ingreso se repita automáticamente (diario/semanal/mensual/anual) sin ir a otra pantalla.
6. Como member sin cuentas, quiero que me lleven a crear una cuenta.
7. Como viewer, no quiero poder registrar.

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Ruta `/new` dedicada (full-screen) con datos de servidor: cuentas activas + saldos, categorías activas + uso. |
| FR-02 | Tabs de tipo: `expense` \| `income` \| `transfer` \| `adjustment`, con color por tipo. `?type=` / `?new=` preselecciona. |
| FR-03 | Monto grande con `AmountInput` (coma decimal, KRI-33); signo y color por tipo. |
| FR-04 | Cuenta(s) como tarjetas con emoji por tipo y saldo formateado. Transferencia = origen + destino (destino ≠ origen). |
| FR-05 | Categoría en grilla (emoji + label) filtrada por tipo, ordenada por uso. |
| FR-06 | Fecha (`DateField`) y nota (máx. 80). |
| FR-07 | Frecuencia `once \| daily \| weekly \| monthly \| yearly`. ≠ `once` ⇒ `RecurringRule` (SPEC-18). Oculto en ajuste. |
| FR-08 | Gasto grupal (solo gasto): toggle, modo `equal`/`custom`, integrantes por nombre libre + sugerencias, preview de reparto. |
| FR-09 | Un solo action `createCoreTransactionAction` (dispatch por `type`): ledger o ajuste. |
| FR-10 | Tras guardar: estado “Guardado” ~1.2s y navegación a Inicio (`/dashboard`). |
| FR-11 | Sin cuentas activas ⇒ redirige a `/accounts`. Viewer ⇒ `/transactions`. Sin sesión ⇒ `/login`. |
| FR-12 | `/transactions/new` redirige a `/new`. El `FormSheet` global deja de montarse. |

## 5. Reglas de negocio

- Dominio puro (TDD) en `transactions/domain`: `group-split.ts` y `frequency.ts` (ver §8).
- Reutiliza guards existentes: `assertValidAmount`, `assertCategoryRequiredForType`, `assertTransferCounterparty`, `assertTransferAccounts`, `assertAccountActive`, `assertAccountBelongsToWorkspace`, `assertCategoryKindMatches`, `assertOccurredOnNotTooFuture`, `assertTransactionCurrencyMatchesAccount`, `normalizeDescription`.
- `occurredOn` conserva la regla de SPEC-05/22 (no > hoy + 1 día en timezone del usuario). La spec original pedía fechas futuras libres; se **mantiene la guard** por consistencia con el ledger.
- **Igual que SPEC-22**, una `RecurringRule` no admite `adjustment_*` (ajuste no recurre).
- El gasto grupal es **solo** `income`/`expense`. La UI lo ofrece en gasto; el servicio lo rechaza en transferencia.

### 5.1 Reparto grupal (dominio puro)

- Normalizar y validar nombres (1…40, únicos case-insensitive).
- `equal`: `per = floor(total / (n + 1))`; integrantes `per`; usuario `total − per·n` (absorbe el resto).
- `custom`: `userShareCents = max(0, total − Σ integrantes)`; si se pasa, `exceededCents > 0` y `hasExcess`.
- Integrantes persistidos con `position`.

### 5.2 Frecuencia

- `toRecurringFrequency(once) = null`; el resto mapea 1:1 a `RecurringFrequency`.
- `daily` se **agrega** al enum `RecurringFrequency` y al cálculo de cadencia (SPEC-18).

## 6. Comandos y consultas

| Tipo | Nombre | Input | Output |
|------|--------|-------|--------|
| Command | `CreateCoreTransaction` (ledger) | `type`, `accountId`, `counterpartyAccountId?`, `categoryId?`, `amountCents`, `occurredOn`, `description?`, `currency?`, `frequency?`, `groupSplit?` | `{ transactionId, groupSplitId, recurringRuleId }` |
| Command | `CreateBalanceAdjustment` (SPEC-22) | (existente) | `{ transactionId, signedEffect }` |
| Action | `createCoreTransactionAction` | `unknown` (Zod dispatch por `type`) | `ActionResult<{ transactionId, signedEffect?, recurringRuleId? }>` |
| Query | (página) | — | cuentas activas + categorías + uso |

## 7. Modelo de datos

- `Transaction.groupSplit` (1:1 opcional) → `TransactionGroupSplit` (`Cascade`).
- `TransactionGroupSplit` → `TransactionGroupSplitMember[]` (`Cascade`).
- Enum nuevo `GroupSplitMode { equal, custom }`.
- Enum `RecurringFrequency` += `daily`.
- Migración: `20261013120000_core_transaction_group_split` (incluye `apply_rls_lockdown_to_public_tables()`).

## 8. Contratos de dominio (puro)

```ts
// src/features/transactions/domain/group-split.ts
export const GROUP_SPLIT_MODES = ["equal", "custom"] as const
export function computeGroupSplit(input: {
  totalCents: number
  mode: GroupSplitMode
  members: readonly GroupSplitMemberInput[]
}): GroupSplitResult
export function assertGroupMemberName(raw: string): string
export function hasGroupMemberName(names: readonly string[], candidate: string): boolean

// src/features/transactions/domain/frequency.ts
export const TRANSACTION_FREQUENCIES = ["once","daily","weekly","monthly","yearly"] as const
export function transactionSupportsRecurrence(type: NewTransactionFormType): boolean
export function toRecurringFrequency(f: TransactionFrequency): RecurringFrequency | null
```

Errores: `GroupSplitError`, `InvalidGroupMemberNameError`, `DuplicateGroupMemberError`, `GroupSplitNotAllowedError`, `RecurrenceNotAllowedError`.

## 9. Criterios de aceptación

- [ ] Monto → cuenta → categoría → Registrar persiste una tx y navega a Inicio.
- [ ] Transferencia exige destino ≠ origen y sin categoría.
- [ ] Ajuste muestra saldo actual y objetivo; sin categoría, frecuencia ni split.
- [ ] Frecuencia semanal crea `RecurringRule` y setea `recurringRuleId`/`scheduledOn`.
- [ ] Gasto grupal equal/custom reparte según §5.1 y persiste integrantes con orden.
- [ ] `daily` funciona en la cadencia de recurrentes.
- [ ] CTA de sidebar, tab bar y botones llevan a `/new`; `/transactions/new` redirige.
- [ ] Viewer no accede; sin cuentas → `/accounts`.

## 10. Escenarios de test (TDD) — implementados

- `group-split.test.ts`: equal con resto, custom con remanente, custom con exceso, nombre vacío, duplicados, moneda/total inválidos.
- `frequency.test.ts`: mapeo `once`→null, resto 1:1, soporte de recurrencia por tipo.
- `cadence.test.ts`: ocurrencia `daily` (SPEC-18).

## 11. Impacto en código

| Módulo | Cambio |
|--------|--------|
| `prisma/schema.prisma` | `daily`, `GroupSplitMode`, `TransactionGroupSplit(…Member)`, relación en `Transaction` |
| `transactions/domain` | `group-split.ts`, `frequency.ts`, errores, barrel |
| `recurring/domain` | `daily` en tipos/cadencia/guards; label en `recurring/components/labels.ts` |
| `transactions/services` | `create-core-transaction.ts` (tx + split + regla en una transacción DB) |
| `transactions/actions` | `create-core-transaction.ts` |
| `transactions/schemas` | `createCoreLedgerTransactionSchema`, `createCoreAdjustmentSchema`, `coreTransactionTypeSchema` |
| `transactions/components` | `new-transaction-screen.tsx`, `transaction-type-theme.ts`; `open-new-transaction-button.tsx` (Link) |
| `app/(app)/new` | `page.tsx`, `loading.tsx` |
| `app/(app)/transactions/new` | redirige a `/new` |
| `components/app-shell` | `app-shell.tsx` (desmonta sheet), `app-sidebar.tsx`, `mobile-tab-bar.tsx` |

## 12. Fuera de alcance

- Contactos/`SplitGroup` reales en el split ad-hoc (nombres libres en esta entrega).
- Edición desde la pantalla core.
- FX desde la pantalla core.
- Fechas futuras sin límite (se mantiene la guard de SPEC-05).
- Ajuste recurrente.
