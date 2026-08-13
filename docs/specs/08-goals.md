# Spec 08 — Objetivos financieros

| Campo | Valor |
|-------|-------|
| ID | SPEC-08 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-02, SPEC-03, SPEC-05, SPEC-06 |

## 1. Contexto

Objetivos: fondo de emergencia, ahorro para compra, cancelación de deudas. Seguimiento de progreso hacia un monto meta.

**H4 — Aporte = transferencia:** cada aporte materializa un movimiento real en el ledger (transfer origen → destino). El progreso del goal deja de ser un contador aislado: el dinero se mueve entre cuentas y el listado de movimientos muestra una señal visual de “aporte a objetivo”.

## 2. Historias de usuario

1. Quiero crear un objetivo de ahorro con monto y fecha opcional.
2. Quiero registrar aportes al objetivo eligiendo de qué cuenta sale el dinero; el destino es la cuenta vinculada del objetivo.
3. Quiero un objetivo de pago de deuda ligado a una tarjeta (mismo patrón de transferencia).
4. Quiero marcar como completado al alcanzar el target.
5. En el listado de movimientos, quiero reconocer de un vistazo las transferencias que son aportes a un objetivo (badge/label).

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Create goal kind=`save` \| `debt_payoff` |
| FR-02 | `ContributeToGoal` crea **transfer** (origen → `linkedAccountId`) + `GoalContribution` + actualiza `currentAmount` / status — atómico |
| FR-03 | Progress % = current/target (cap 100% para display) |
| FR-04 | Auto-complete cuando current >= target |
| FR-05 | Cancel goal |
| FR-06 | `linkedAccountId` opcional al **crear**; **obligatorio** para aportar (destino de la transfer) |
| FR-07 | Listado / detalle de movimientos: enriquecer transfers con metadata de aporte a goal (badge) |
| FR-08 | `UpdateGoal`: nombre, kind, target, fecha meta, cuenta vinculada (no currency) |
| FR-09 | `DeleteGoal` (hard-delete) con confirmación por nombre; aportes ya transferidos **quedan** en el ledger |

## 4. Reglas de negocio

### 4.1 Goal (creación y estado)

- `goal.currency ∈ { ARS, USD }`; default al crear = `workspace.baseCurrency`.
- `linkedAccountId` si está presente: misma moneda que el goal; misma workspace; cuenta no archivada al vincular.
- Goal `status=active` + `linkedAccountId` set → bloquea `ArchiveAccount` / `DeleteAccount` de esa cuenta (SPEC-03: `AccountLinkedToActiveGoal`). Cancelar o completar el goal libera el bloqueo.
- `targetAmount > 0`; `currentAmount >= 0`.
- Decisión MVP: aporte que excede el restante se acepta y `status=completed`; `current` puede ser `>= target`.
- Cancel / completed: no aceptan nuevos aportes (`GoalNotActive`).

### 4.2 ContributeToGoal = transfer + contribución (H4)

Un aporte **siempre** materializa:

1. Una `Transaction` `type=transfer` (mismas invariantes que [SPEC-06](./06-transfers.md)).
2. Un `GoalContribution` con `transactionId` **1:1** a esa transfer.
3. Actualización de `goal.currentAmountCents` y auto-complete (FR-04).

**Cuentas**

| Rol | Fuente | Notas |
|-----|--------|-------|
| Origen (`fromAccountId`) | Input del comando / form | Requerido; activa; mismo workspace; moneda = `goal.currency` |
| Destino | `goal.linkedAccountId` | Requerido al aportar; **no** se elige en el form MVP |

- `fromAccountId ≠ linkedAccountId` (reusa error de transfer `SameAccountTransfer` / equivalente).
- Sin FX: monedas de origen, destino y goal deben coincidir.
- El aporte **no** es income/expense: no afecta budgets (`spent`).
- `contributedOn` del aporte = `occurredOn` de la transfer.
- `note` del aporte → `description` de la transfer (normalizada; puede ser null). Descripción sugerida de dominio si note vacío: opcional prefijo tipo nombre del goal (service puede setear; no es invariante dura).

**Atomicidad**

- Insert transfer + insert `GoalContribution` + update Goal en **una** transacción de Postgres.
- Si falla cualquier paso → rollback completo (sin contribución huérfana ni transfer sin vínculo).

**debt_payoff vs save**

| Aspecto | `save` | `debt_payoff` |
|---------|--------|---------------|
| Ledger | Misma: `CreateTransfer` / transfer | Igual |
| Destino típico | Cuenta ahorro / fondo | `credit_card` (u otra cuenta de la deuda) |
| Efecto en tarjeta | N/A | Destino tarjeta = pago → baja deuda (SPEC-06 T-05) |
| `currentAmount` | Ahorrado hacia la meta | Pagado hacia la deuda |
| Tipo de tx | `transfer` (no hay tipo `goal_*`) | Igual |
| Badge listado | Metadata de goal (kind distingue label UI) | Igual |

No hay comando ni tipo de ledger distinto para deuda: **mismo patrón transfer**.

### 4.3 ABM (KRI-27)

El MVP ya tenía create / contribute / cancel / complete en dominio, pero **sin edición ni baja** y con un form de alta que no dejaba elegir cuenta/moneda (native `<select>` dentro del FormSheet). Esta iteración cierra el ABM.

**UpdateGoal**

| Campo | Regla |
|-------|--------|
| `name` | Mismas reglas que create (`normalize` + `assertValidGoalName`) |
| `kind` | `save` \| `debt_payoff`; se puede cambiar (etiqueta; no reescribe transfers previas) |
| `targetAmountCents` | `> 0`. Si `current >= nuevo target` → `status=completed`. Si estaba `completed` y el nuevo target deja `current < target` → vuelve a `active` |
| `targetDate` | ISO date o `null` (limpiar) |
| `linkedAccountId` | `string` (vincular/cambiar) o `null` (desvincular). Misma moneda/workspace; cuenta no archivada. Desvincular bloquea aportes nuevos (`GoalLinkedAccountRequired`) |
| `currency` | **Inmutable** tras el alta (no va en el comando) |
| `status=cancelled` | Rechaza update (`GoalNotActive`) |

**DeleteGoal**

- Hard-delete de la fila `Goal`. `GoalContribution` cascada Prisma; las **transfers del ledger se conservan** (el dinero sí se movió).
- Confirmación fuerte: `confirmName` debe coincidir con `goal.name` (trim).
- Permitido en cualquier status (`active` / `completed` / `cancelled`).
- No revierte `currentAmount` (el goal deja de existir).

**Create / contribute UI**

- No usar native `<select>` dentro del FormSheet para moneda ni cuentas (el picker del OS no es usable en el drawer).
- Moneda: `SegmentedControl` ARS/USD (igual que movimientos).
- Cuenta vinculada / origen del aporte: lista táctil in-sheet, filtrada por moneda del goal; orden preferido según `kind` (`save` → savings primero; `debt_payoff` → credit_card primero).
- Sin cuentas en esa moneda: empty state, no un select vacío.

### 4.4 Vínculo Contribution ↔ Transaction

| Campo | Regla |
|-------|-------|
| `GoalContribution.transactionId` | Required, unique (1 contribución ↔ 1 transfer) |
| `GoalContribution.amountCents` | = `Transaction.amountCents` |
| Borrado de la transfer | Cascada de dominio: eliminar contribución y **restar** el monto de `goal.currentAmountCents`; si el goal estaba `completed` y queda `current < target` → vuelve a `active` (no reabrir `cancelled`) |
| Update de monto/cuentas de la transfer ligada | MVP: **rechazar** mutación de `amount` / `accountId` / `counterpartyAccountId` con error `TransferLinkedToGoal` (editar descripción/fecha: permitido sincronizando `note`/`contributedOn` si se toca fecha — ver riesgos) |

### 4.5 Señal visual en listado (badge)

- La transfer **sigue** siendo `type=transfer` (filtros SPEC-05 sin cambio de matriz).
- El DTO de listado/detalle incluye metadata opcional de aporte (join `GoalContribution` → `Goal`), p. ej.:

```ts
goalContribution: null | {
  contributionId: string
  goalId: string
  goalName: string
  goalKind: 'save' | 'debt_payoff'
}
```

- UI: badge/label (“Objetivo”, “Aporte a objetivo”, o “Pago de deuda” si `goalKind=debt_payoff`) — copy exacto es UI, no dominio.
- **No** inventar `TransactionType` nuevo ni depender solo de parsear `description`.

## 5. Comandos y consultas

| Tipo | Nombre | Input destacado |
|------|--------|-----------------|
| Command | `CreateGoal` | name, kind, targetAmountCents, currency?, targetDate?, linkedAccountId? |
| Command | `ContributeToGoal` | goalId, **fromAccountId**, amountCents, contributedOn, note? |
| Command | `CancelGoal` | goalId |
| Command | `UpdateGoal` | goalId, name?, kind?, targetAmountCents?, targetDate?, linkedAccountId? |
| Command | `DeleteGoal` | goalId, **confirmName** |
| Query | `ListGoals` | workspaceId |
| Query | `GetGoalProgress` | goalId |

### 5.1 Contrato Zod / action — `ContributeToGoal`

```ts
contributeToGoalSchema = {
  goalId: string           // required
  fromAccountId: string    // required — cuenta origen del dinero
  amountCents: number      // int > 0
  contributedOn: string    // YYYY-MM-DD → transfer.occurredOn + contribution.contributedOn
  note?: string | null     // max 240; → transfer.description + contribution.note
}
// Destino: siempre goal.linkedAccountId (no va en el schema)
```

**Respuesta service (mínimo):** `{ goal, contributionId, transactionId }`.

### 5.2 Persistencia (Prisma — hand-off)

```text
GoalContribution {
  ...
  transactionId  String  @unique
  transaction    Transaction @relation(...)
}
Transaction {
  goalContribution GoalContribution?  // optional reverse
}
```

Migración: aportes históricos **sin** transfer (si existen en ambientes) quedan fuera de H4 o se backfillean en chore aparte — no bloquean el diseño; ambientes verdes pueden truncar/recrear.

## 6. Criterios de aceptación

- [ ] Progress y auto-complete testeados.
- [ ] Cancel no permite nuevos aportes.
- [ ] Aporte crea transfer visible en `/transactions` con badge de objetivo.
- [ ] Fallo sin `linkedAccountId` / cuentas inválidas / monedas distintas → error de dominio, sin writes parciales.
- [ ] debt_payoff con destino `credit_card` baja la deuda (mismo efecto SPEC-06).
- [ ] Delete de la transfer deshace el aporte (currentAmount y status coherentes).
- [ ] Update de nombre / target / fecha / cuenta vinculada; bajar el target por debajo de current completa; subirlo reabre completed.
- [ ] Delete con confirmación por nombre; transfers de aportes quedan en el listado.
- [ ] Create: se puede elegir tipo, moneda y cuenta vinculada dentro del sheet (sin native select).

## 7. Escenarios de test (TDD)

### T-01 Create save goal

- **Given** target 500000  
- **When** create  
- **Then** current=0, status=active, progress=0

### T-02 Contribute avanza progreso (puro)

- **Given** target 500000, current 0, status active  
- **When** `applyContribution(…, 200000)`  
- **Then** current=200000, progress=40%, status active

### T-03 Complete

- **Given** current 400000, target 500000  
- **When** contribute 100000  
- **Then** status=completed

### T-04 Cancel blocks

- **Given** cancelled  
- **When** contribute  
- **Then** error `GoalNotActive`

### T-05 Invalid amounts

- **When** contribute <= 0  
- **Then** error `InvalidAmount` / `InvalidContributionAmount`

### T-06 Contribute requiere linkedAccount (H4)

- **Given** goal active **sin** `linkedAccountId`  
- **When** ContributeToGoal con fromAccountId válido  
- **Then** error `GoalLinkedAccountRequired` — sin Transaction ni GoalContribution

### T-07 Contribute crea transfer hacia linkedAccount (H4)

- **Given** goal save active, linkedAccount=B (savings), currency ARS; cuenta A checking ARS balance 100000; B balance 0  
- **When** ContributeToGoal fromAccountId=A, amountCents=20000, contributedOn=2026-08-01  
- **Then**
  - Transaction type=`transfer`, accountId=A, counterpartyAccountId=B, amountCents=20000, occurredOn=2026-08-01
  - GoalContribution.transactionId = esa tx; amountCents=20000
  - goal.currentAmountCents += 20000
  - balances derivados: A −20000, B +20000
  - ListTransactions incluye la tx con `goalContribution.goalId` / `goalName` / `goalKind=save` no null

### T-08 Origen = destino

- **Given** linkedAccount=B  
- **When** fromAccountId=B  
- **Then** error `SameAccountTransfer` (o `GoalContributionSameAccount`) — sin writes

### T-09 Moneda distinta

- **Given** goal ARS, linked B ARS; fromAccount C USD  
- **When** contribute  
- **Then** error de currency mismatch (dominio transfer / goal) — sin writes

### T-10 Cuenta origen archivada

- **Given** fromAccount archivada  
- **When** contribute  
- **Then** error `AccountArchived`

### T-11 debt_payoff = mismo patrón transfer (H4)

- **Given** goal debt_payoff, linkedAccount=tarjeta (credit_card) deuda 80000; checking 100000  
- **When** contribute 30000 from checking → tarjeta  
- **Then** transfer creada; checking −30000; deuda tarjeta −30000; goal.current += 30000; listado con `goalKind=debt_payoff`

### T-12 Atomicidad (fallo simulado / invariante)

- **Given** precondiciones válidas  
- **When** falla la persistencia de GoalContribution tras crear tx (o update goal)  
- **Then** ninguna de las tres escrituras queda visible (rollback)

### T-13 Delete transfer deshace aporte (H4)

- **Given** aporte de 20000 (current pasó de 0→20000, status active)  
- **When** DeleteTransaction de esa transfer  
- **Then** GoalContribution eliminada; current=0; tx no listada; balances restaurados

### T-14 Delete transfer reabre completed si corresponde

- **Given** aporte que completó el goal (current >= target, status=completed)  
- **When** delete de esa transfer deja current < target  
- **Then** status vuelve a `active` (si no estaba cancelled)

### T-15 Update amount de transfer ligada — rechazado

- **Given** transfer con GoalContribution  
- **When** UpdateTransaction cambia amountCents  
- **Then** error `TransferLinkedToGoal`

### T-16 Resolve transfer accounts (puro)

- **Given** goal con linkedAccountId=B, from=A, ambas activas misma currency/workspace  
- **When** `assertGoalContributionTransferAccounts({…})`  
- **Then** ok → `{ fromAccountId: A, toAccountId: B }`

- **Given** linkedAccountId null  
- **When** assert…  
- **Then** `GoalLinkedAccountRequired`

### T-17 Update target auto-complete / reopen (puro)

- **Given** current 200000, target 500000, status active  
- **When** `applyGoalTargetChange(…, 150000)`  
- **Then** status=completed

- **Given** current 200000, target 200000, status completed  
- **When** `applyGoalTargetChange(…, 500000)`  
- **Then** status=active

### T-18 Update cancelled — bloqueado

- **Given** status cancelled  
- **When** UpdateGoal  
- **Then** error `GoalNotActive`

### T-19 Linked account guards (puro)

- **Given** cuenta archivada / otra moneda / otro workspace  
- **When** `assertLinkedAccountForGoal`  
- **Then** `GoalLinkedAccountInvalidError`

### T-20 Delete confirmation (puro)

- **Given** name="Fondo"  
- **When** confirmName="fondo" (case) o distinto  
- **Then** error `GoalDeleteConfirmationMismatchError` si no coincide exacto tras trim

## 8. Fuera de alcance

- Intereses / proyecciones de inversión
- Sugerencias de aporte mensual (analytics P2)
- Elegir destino distinto de `linkedAccountId` en el form de aporte
- Funding de goal vía canje FX automático (ARS↔USD)
- Backfill de aportes históricos pre-H4 sin `transactionId`
- Compensating contribution manual (aporte negativo); undo = delete de la transfer
- Tipo de ledger `goal_contribution` separado de `transfer`

## 9. Notas de implementación (hand-off)

- Reutilizar guards de transfer (`assertTransferAccounts`, currency, archived) desde domain de transactions o wrapper en goals/domain.
- Service `contributeToGoal`: authz goal + load accounts + domain assert + `prisma.$transaction` (create tx → create contribution → update goal). Preferir **no** llamar `createTransfer` service anidado si ya abre su propia tx; extraer helper de persistencia compartido o inline con mismas invariantes.
- Listado: left join / include `goalContribution` + `goal` en `listTransactions` / `GetTransactionDetail`.
- UI form aporte: selector de cuenta origen (+ amount, date, note); mostrar destino read-only = linked account name.
- Prisma comment en `Goal` / `GoalContribution`: retirar “MVP no crea Transaction”.
- ABM UI: menú por fila (Editar / Completar / Cancelar / Eliminar) + FormSheet de edición, mismo patrón que cuentas. Listar cancelled al final (como archivadas).
- Create/edit/contribute: `AccountChoiceList` in-sheet, no native `<select>`.
