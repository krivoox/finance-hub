# Modelo de dominio

Lenguaje ubicuo en inglés en código; términos de negocio en español en docs.

## Diagrama de relaciones (conceptual)

```text
User
  └── Membership ──► Workspace
                        ├── Account
                        ├── Category
                        ├── Transaction (Income | Expense | Transfer) ──► RecurringRule? (opcional)
                        ├── RecurringRule
                        ├── Budget
                        ├── Goal
                        └── (si es grupal) Split / Settlement
```

## Entidades

### User

Persona autenticada. Identidad de producto vía **Better Auth** (email/password y/o Google OAuth). Un email = un User (case-insensitive). Las credenciales OAuth viven en el modelo infra `Account` de Better Auth (no confundir con la entidad financiera Account).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| email | Email | único |
| displayName | string | |
| preferredCurrency | CurrencyCode | default del usuario |
| timezone | IANA timezone | para periodos |
| createdAt | DateTime | |

**Invariantes (auth / alta)**

- Primer alta (signUp o primer Google con email nuevo): se crea Workspace `personal` + membership `owner` (SPEC-01 / hook `user.create.after`).
- Linking Google a User existente (mismo email, Google verifica email): **no** recrea workspace personal; **no** sobrescribe `displayName` ni preferencias (SPEC-01).

### Workspace

Contenedor de datos financieros. Puede ser personal (1 miembro) o grupal (N miembros).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| name | string | |
| type | `personal` \| `group` | |
| baseCurrency | CurrencyCode | moneda de consolidación |
| createdAt | DateTime | |

**Invariantes**

- Todo Account, Category, Transaction, Budget y Goal pertenece a exactamente un Workspace.
- Un User puede pertenecer a varios Workspaces vía Membership.
- Un workspace está **listo para usar** (onboarding, SPEC-15) cuando tiene ≥1 Account no archivada. Es un estado **derivado**; no hay campo de “setup completado” en el modelo.
- Workspace `personal`: **inborrable** (nunca hard-delete ni soft-archive de workspace en v1 / cercano).
- Workspace `group`: el owner puede **hard-delete** el tenant completo (SPEC-02 FR-10) si no hay vínculos cross-workspace (SPEC-14 / SPEC-02 §5.4). Es **excepción explícita** a la preferencia transversal de soft-delete (§ Reglas transversales): sin grace period ni restore.

### Membership

| Campo | Tipo | Notas |
|-------|------|-------|
| workspaceId | Id | |
| userId | Id | |
| role | `owner` \| `admin` \| `member` \| `viewer` | |
| joinedAt | DateTime | |

**Invariantes**

- Debe existir al menos un `owner` por Workspace.
- `viewer` solo lectura.

### Invitation

Invitación a un workspace (típicamente `group`) por email.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | |
| email | Email | normalizado lowercase |
| role | `admin` \| `member` \| `viewer` | nunca `owner` |
| token | string | único, URL-safe |
| status | `pending` \| `accepted` \| `rejected` \| `expired` | |
| expiresAt | DateTime | TTL 7 días |
| invitedByUserId | Id | |
| createdAt | DateTime | |

**Invariantes**

- Solo owner/admin crean invitaciones.
- Email ya miembro → error.
- Pending no expirada duplicada para el mismo email+workspace → error.
- Al aceptar: membership con el rol de la invitación; status → `accepted`.
- Al registrarse un User cuyo email tiene pending vigentes: se aceptan automáticamente tras crear el workspace personal.

### Account

Cuenta financiera (banco, billetera, efectivo, tarjeta de crédito, etc.).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | |
| name | string | |
| type | AccountType | ver abajo |
| currency | CurrencyCode | |
| initialBalance | Money | saldo al crear |
| isArchived | boolean | no aparece en flujos activos |
| creditLimit | Money? | solo credit |

```ts
type AccountType =
  | 'checking'
  | 'savings'
  | 'cash'
  | 'credit_card'
  | 'virtual_wallet'
  | 'other'
```

**Invariantes**

- El saldo actual se deriva: `initialBalance + Σ efectos de transacciones` (no se edita a mano salvo ajuste explícito).
- Cuentas archivadas no aceptan nuevas transacciones ni aparecen en selectores de flujos activos (SPEC-03).
- En `credit_card`, el balance derivado es **deuda** (positivo = adeudado). Expense / transfer-out suben deuda; income / transfer-in (pago desde otra cuenta) la bajan. Detalle: SPEC-03 / SPEC-06.
- Tarjeta física con consumos ARS+USD = **dos** Accounts `credit_card` (una por moneda). No hay Account multi-moneda (ADR-006 / SPEC-03 §5.1).
- **Archivar** (soft): conserva historial; permitido aunque sea la última cuenta activa → el workspace deja de estar “listo” (`needsSetup`, SPEC-15).
- **Eliminar** (hard-delete, SPEC-03): excepción de producto; pierde historial vía cascada de servicio. Bloqueado si es la última cuenta activa, si hay Goal `active` con `linkedAccountId`, o si hay `CrossWorkspaceLink` en txs de la cuenta.
- No archivar ni hard-delete si un Goal `status=active` apunta a la cuenta como `linkedAccountId`.

### Category

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | |
| name | string | |
| kind | `income` \| `expense` | |
| parentId | Id? | subcategorías opcionales |
| isArchived | boolean | |

### Transaction

Movimiento financiero. Tres formas:

| Tipo | Efecto |
|------|--------|
| Income | +Money en una Account |
| Expense | −Money en una Account |
| Transfer | −Money en origen, +Money en destino (mismo workspace) |

Campos comunes:

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | |
| type | `income` \| `expense` \| `transfer` \| `fx_debit` \| `fx_credit` | |
| amount | Money | siempre > 0 |
| occurredOn | Date | fecha contable |
| description | string? | |
| categoryId | Id? | requerido en income/expense; null en transfer pura |
| accountId | Id | cuenta principal (origen en transfer) |
| counterpartyAccountId | Id? | destino en transfer |
| createdByUserId | Id | |
| splitId | Id? | si participa en gasto compartido |
| recurringRuleId | Id? | plantilla que generó la tx (SPEC-18); null en manuales |
| scheduledOn | Date? | fecha planificada por la plantilla; siempre presente si `recurringRuleId != null` |

**Invariantes**

- `amount.currency` debe coincidir con la cuenta afectada. El formulario de alta permite elegir ARS|USD (default = `workspace.baseCurrency`) y solo lista cuentas de esa moneda; mismatch → `TransactionCurrencyMismatchError`.
- Transfer: `accountId ≠ counterpartyAccountId`, ambas del mismo workspace, **misma currency**.
- Canje (`fx_debit` / `fx_credit`): ver `CurrencyExchange`; no cuentan en cashflow ni budget spent.
- Income/expense: `accountId` puede ser de otro workspace del mismo usuario (funded externo, SPEC-14); el `workspaceId` de la tx es el contexto de registro (categorías, budgets, splits).
- Baja de cuenta: **preferir Archivar** (conserva txs). `DeleteAccount` (SPEC-03) es excepción de producto: hard-delete con cascada explícita de txs/reglas/canjes de esa cuenta.
- Transfer ligada a `GoalContribution` (SPEC-08 H4): delete cascada deshace el aporte; update de monto/cuentas rechazado.
- `(recurringRuleId, scheduledOn)` es único cuando `recurringRuleId != null` (materialización idempotente, SPEC-18).
- `recurringRuleId != null ⇔ scheduledOn != null`.
- Borrar/editar una tx materializada **no** libera la ocurrencia: el par sigue consumido.

**Listado (SPEC-05 FR-04):** filtros AND sobre periodo (timezone del usuario), tipo de UI (`all`|income|expense|transfer), cuenta y categoría; paginación cursor. El periodo `this_week` es lunes–domingo calendario — no el ancla weekly de Budget. DTO puede incluir `goalContribution` (join) para badge de aporte a objetivo — la tx sigue siendo `type=transfer`. DTO puede incluir `recurring: { ruleId, ruleName, scheduledOn, isDrifted }` (join) para indicador 🔄 / `Repeat` — `isDrifted = (occurredOn !== scheduledOn)`.

### CurrencyExchange

Canje entre dos cuentas del mismo workspace con monedas distintas (SPEC-16).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | |
| fromAccountId | Id | débito |
| toAccountId | Id | crédito |
| fromAmountCents | number | > 0 |
| toAmountCents | number | > 0 |
| fromTransactionId | Id | tx `fx_debit` |
| toTransactionId | Id | tx `fx_credit` |
| occurredOn | Date | |
| description | string? | |

**Invariantes**

- Monedas distintas; ambas en `ACCOUNT_CURRENCIES` (ARS|USD).
- Dos efectos de ledger: −from en origen, +to en destino.
- Delete en cascada sobre el par de txs.

### WorkspaceConsolidationRate

Tasa manual única activa por workspace para patrimonio estimado. Puede originarse en carga manual o en apply explícito desde cotización MEP ([SPEC-19](./specs/19-usd-quotes-dolarapi.md)); el feed **no** la actualiza solo.

| Campo | Tipo | Notas |
|-------|------|-------|
| workspaceId | Id | unique |
| quoteCurrency | CurrencyCode | tipicamente USD cuando base=ARS |
| rateScaled | number | enteros; scale documentado en dominio (`CONSOLIDATION_RATE_SCALE = 1_000_000`) |
| label | string | ej. "Blue", "MEP", "Manual" |
| asOf | Date | |

### UsdQuoteSnapshot / UsdQuoteLine (SPEC-19)

Snapshot **global** (no tenancy) de cotizaciones USD del día vía [DolarApi.com](https://dolarapi.com/docs/). Refresh programado 1×/día; la UI lee DB, no el provider.

| Entidad | Rol |
|---------|-----|
| UsdQuoteSnapshot | Un row por `asOfDate` (calendario `America/Argentina/Buenos_Aires`); `fetchedAt`, `provider` (`dolarapi`), `providerUrl` |
| UsdQuoteLine | Por `casa` (`oficial` \| `bolsa` \| `tarjeta` \| …); `buyRateScaled` / `sellRateScaled` / `scale` / `providerUpdatedAt` |

**Invariantes**

- Rates enteros > 0; scale alineado a consolidación (`1_000_000`).
- `casa: "bolsa"` ≡ **MEP** en producto; apply a consolidación es comando explícito (label `"MEP"`, side venta).
- `tarjeta` informativa / opcional; **no** es fuente fiscal (suele ser oficial × 1.30 legacy).
- Snapshot usable en UI requiere al menos `oficial` + `bolsa`.

### CrossWorkspaceLink

Vínculo 1↔1 entre dos transacciones de workspaces distintos (aporte / fondeo).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| kind | `contribution` \| `externally_funded_expense` | |
| sourceTransactionId | Id | pata que saca dinero (expense del aporte) |
| targetTransactionId | Id | pata que recibe (income del aporte) |

**Invariantes**

- Solo `contribution` materializa siempre ambas puntas.
- Delete/update de monto en cascada sobre el par.
- Categorías de aporte excluidas del `spent` de presupuestos de consumo.
- Un workspace **no** puede hard-delete-arse mientras existan links (u otros involucramientos cross-workspace listados en SPEC-02 §5.4) que lo involucren; no se cortan automáticamente (SPEC-02 FR-11).

### Money (value object)

```ts
type Money = {
  amountCents: number // entero >= 0 en value object; el signo lo da el tipo de movimiento
  currency: CurrencyCode
}
```

Ver ADR-001.

### Budget

Límite de gasto por categoría (o conjunto) en un periodo.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | |
| name | string | |
| period | `monthly` \| `weekly` \| `custom` | |
| startDate | Date | |
| endDate | Date? | custom |
| limit | Money | |
| categoryIds | Id[] | vacío = todas expense |

**Derivado:** `spent` = suma de expenses en el periodo que matchean categorías.

### Goal

Objetivo de ahorro o pago de deuda.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | |
| name | string | |
| kind | `save` \| `debt_payoff` | |
| targetAmount | Money | |
| currentAmount | Money | aportado / pagado (denormalizado; suma de contribuciones) |
| targetDate | Date? | |
| linkedAccountId | Id? | opcional al crear; **requerido para aportar** (destino de la transfer) |
| status | `active` \| `completed` \| `cancelled` | |

**Invariantes (H4 / SPEC-08)**

- Un aporte (`ContributeToGoal`) materializa siempre: `Transaction` `type=transfer` (origen = cuenta elegida, destino = `linkedAccountId`) + `GoalContribution` + avance de `currentAmount` / auto-complete — atómico.
- `debt_payoff` usa el **mismo** patrón transfer; si el destino es `credit_card`, el efecto de deuda es el de SPEC-06 (pago baja deuda).
- Sin FX en el aporte: monedas de origen, destino y goal alineadas.
- Goal `status=active` con `linkedAccountId` set: **bloquea** `ArchiveAccount` y `DeleteAccount` de esa cuenta (`AccountLinkedToActiveGoal`, SPEC-03). Goals `completed` / `cancelled` no bloquean; en hard-delete se nullifica `linkedAccountId`.

### GoalContribution

Evento de aporte a un Goal. Inmutable en MVP salvo cascada al borrar la transfer vinculada.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| goalId | Id | |
| amountCents | number | > 0; = monto de la transfer |
| contributedOn | Date | = `occurredOn` de la transfer |
| note | string? | espejo de `description` de la transfer |
| createdByUserId | Id | |
| transactionId | Id | **unique**, 1:1 con la `Transaction` transfer |

**Invariantes**

- Toda contribución H4 tiene exactamente una transfer; no hay aporte “solo contador”.
- Delete de la transfer: elimina la contribución y restaura `Goal.currentAmount` (y status `completed`→`active` si aplica).
- Update de amount/cuentas de la transfer ligada: rechazado (`TransferLinkedToGoal`).

### Split (gasto compartido)

Distribución de un expense entre miembros del workspace grupal.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | |
| expenseTransactionId | Id | |
| paidByUserId | Id | quién pagó |
| method | `equal` \| `percentage` \| `exact` | |
| shares | SplitShare[] | |

```ts
type SplitShare = {
  userId: Id
  shareCents: number // >= 0
}
```

**Invariantes**

- `Σ shareCents === expense.amount.amountCents`
- Solo en workspaces `type === 'group'`

### Settlement

Pago entre miembros para saldar balances de splits.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | |
| fromUserId | Id | |
| toUserId | Id | |
| amount | Money | |
| occurredOn | Date | |

### RecurringRule

Plantilla que describe **qué** movimiento se repite y **cada cuánto**. No es una `Transaction`; no afecta saldos ni budgets hasta que el usuario **materializa** una ocurrencia ([SPEC-18](./specs/18-recurring-transactions.md)).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | tenancy |
| name | string | descripción humana ("Alquiler", "Sueldo", "Netflix") |
| type | `income` \| `expense` \| `transfer` | sin `fx_*` en v1 |
| amountCents | number | > 0 |
| currency | CurrencyCode | = `account.currency` (y counterparty en transfer) |
| accountId | Id | cuenta principal; en transfer = origen |
| counterpartyAccountId | Id? | destino en transfer; null en income/expense |
| categoryId | Id? | requerido en income/expense; null en transfer |
| description | string? | espejo opcional para la tx generada |
| frequency | `weekly` \| `biweekly` \| `monthly` \| `yearly` | sin `daily` ni custom |
| startDate | Date | primera ocurrencia proyectada (ancla) |
| endDate | Date? | inclusiva; no proyecta `scheduledOn > endDate` |
| status | `active` \| `paused` \| `ended` | |
| pausedReason | `manual` \| `account_archived` \| null | solo si `status = paused` |
| createdByUserId | Id | member+ |
| endedAt | DateTime? | set al pasar a `ended` |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Invariantes**

- `type = transfer` ⇔ `counterpartyAccountId != null` y `categoryId = null`.
- `type ∈ { income, expense }` ⇔ `counterpartyAccountId = null` y `categoryId != null` (kind compatible).
- `accountId ≠ counterpartyAccountId`; ambas del mismo workspace; misma `currency`.
- `amountCents > 0`; sin FX.
- Ocurrencias proyectadas **no** se persisten: se calculan con función pura sobre la regla y una ventana (SPEC-18 §4.2). El único estado persistido de una ocurrencia es la `Transaction` que la materializa.
- Idempotencia: `(recurringRuleId, scheduledOn)` único en `Transaction`.
- Editar la plantilla no reescribe txs históricas: cambios de monto/cuenta/categoría afectan solo futuras no materializadas.
- Eliminar plantilla = `ended` (soft-delete); las txs ya generadas mantienen `recurringRuleId` para el tooltip “Generada por: {name}”.
- **Excepción:** `DeleteAccount` (SPEC-03) hard-deletea `RecurringRule` que usan esa cuenta (tras nullificar FKs en txs), porque la cuenta padre desaparece.
- Al archivar una cuenta usada por la regla → `paused` con `pausedReason = account_archived`; desarchivar **no** reactiva.
- Roles: `owner` / `admin` / `member` crean, editan, materializan; `viewer` solo lee.
- Timezone = `User.timezone` para clasificación vencida/hoy/próxima (SPEC-01).

## Agregados sugeridos

| Agregado | Raíz | Contiene |
|----------|------|----------|
| Workspace | Workspace | Memberships (o agregado aparte) |
| Account | Account | — |
| Transaction | Transaction | — |
| Budget | Budget | — |
| Goal | Goal | GoalContribution[] |
| Split | Split | shares |
| RecurringRule | RecurringRule | — (ocurrencias son proyecciones; materializaciones viven bajo `Transaction`) |

Los saldos de cuenta y balances entre miembros son **lecturas derivadas**, no estado mutable independiente (salvo settlements que ajustan el ledger de deudas).

## Reglas transversales

1. Autorización: toda mutación verifica Membership + role.
2. Soft-delete / archive preferido a hard-delete cuando hay historial.
   - **Excepción (SPEC-02):** eliminar un workspace `group` es **hard-delete real** del grafo del tenant (cuentas, txs, budgets, goals, memberships, etc.). Bloqueado si hay involucramiento cross-workspace (SPEC-14). El workspace `personal` no se elimina.
   - **Excepción (SPEC-03):** `DeleteAccount` — hard-delete de cuenta con confirmación fuerte y cascada de servicio; Archive sigue siendo el camino recomendado.
3. Idempotencia: comandos de creación pueden aceptar `clientRequestId` (fase P1+).
4. Multi-moneda (ADR-006): cuentas ARS|USD; ledger nativo por moneda; canje explícito (`CurrencyExchange`); patrimonio consolidado solo con tasa manual del workspace. `baseCurrency` = consolidación y defaults — no única moneda permitida.
