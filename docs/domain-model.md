# Modelo de dominio

Lenguaje ubicuo en inglés en código; términos de negocio en español en docs.

## Diagrama de relaciones (conceptual)

```text
User
  └── Membership ──► Workspace personal (único tenant de ledger; ADR-007)
                        ├── Account, Category, Transaction, RecurringRule, Budget, Goal, …
                        └── SplitGroup[]          (dueño de datos = este tenant)
                               ├── SplitGroupMember[]   (user | ghost)  ← identidad = memberId
                               ├── ExpenseSplit[]       (IOU; tx puede vivir en OTRO personal)
                               │      └── shares[]      (memberId, shareCents)
                               └── Settlement[]         (fromMemberId / toMemberId)

User ── SplitGroupMember.kind=user ──► SplitGroup   (sin Membership en el tenant de Ana)
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
- Un User puede ser `SplitGroupMember` `kind=user` en grupos creados por otros; eso **no** crea `Membership` en el tenant ajeno (ADR-007).
- Hook `user.create.after`: **ya no** auto-acepta `Invitation` de tenant (entidad retirada).

### Workspace

Contenedor de datos del **ledger** (tenancy, [ADR-002](./adr/002-workspace-tenancy.md) enmendado por [ADR-007](./adr/007-split-group-tenancy.md)). Producto: el usuario opera **exactamente un** workspace personal. El tipo `group` como segundo ledger **está retirado**; los círculos de gastos son `SplitGroup` (SPEC-09), no un tenant.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| name | string | |
| type | `personal` | columna histórica; el valor `group` se elimina en la migración KRI-29 |
| baseCurrency | CurrencyCode | moneda de consolidación; al crear un SplitGroup se **copia** a `SplitGroup.currency` |
| createdAt | DateTime | |

**Invariantes**

- Todo Account, Category, Transaction, Budget y Goal pertenece a exactamente un Workspace.
- Producto v1: un User tiene **exactamente un** Membership, en su workspace personal (`owner`). Unirse a un SplitGroup **no** crea Membership.
- Un workspace está **listo para usar** (onboarding, SPEC-15) cuando tiene ≥1 Account no archivada. Es un estado **derivado**; no hay campo de “setup completado” en el modelo.
- Workspace `personal`: **inborrable** (nunca hard-delete ni soft-archive de workspace en v1 / cercano).
- Workspace `group`: **retirado (KRI-29 / ADR-007)**. La migración **borra** tenants `group` existentes y el valor del enum. Los grupos de usuario son `SplitGroup`.

### Membership

| Campo | Tipo | Notas |
|-------|------|-------|
| workspaceId | Id | |
| userId | Id | |
| role | `owner` \| `admin` \| `member` \| `viewer` | |
| joinedAt | DateTime | |

**Invariantes**

- Debe existir al menos un `owner` por Workspace.
- Producto v1: el personal tiene un único membership `owner`. Roles `admin` / `member` / `viewer` quedan en schema (leftover de group tenant); **no** aplican a SplitGroup.
- `viewer` (si existiera en un tenant) solo lectura de **ledger**, no es un rol de SplitGroup.

### Invitation (retirado — KRI-29)

Invitación a un **workspace tenant** por email. **No forma parte del producto** post-KRI-29: no hay tenant grupal al que unirse. La tabla `invitation` se **elimina** en la misma migración que SPEC-09. Sumar gente a un círculo = token de `SplitGroup` (`publicShareToken` / `JoinSplitGroup`), no esta entidad.

El auto-accept de invites de workspace al `RegisterUser` (SPEC-01) se retira con esta entidad.

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
- **Eliminar** (hard-delete, SPEC-03): excepción de producto; pierde historial vía cascada de servicio. Bloqueado si es la última cuenta activa o si hay Goal `active` con `linkedAccountId`. El bloqueo histórico por `CrossWorkspaceLink` **desaparece** (SPEC-14 retirada).
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
| recurringRuleId | Id? | plantilla que generó la tx (SPEC-18); null en manuales |
| scheduledOn | Date? | fecha planificada por la plantilla; siempre presente si `recurringRuleId != null` |

**Invariantes**

- `amount.currency` debe coincidir con la cuenta afectada. El formulario de alta permite elegir ARS|USD (default = `workspace.baseCurrency`) y solo lista cuentas de esa moneda; mismatch → `TransactionCurrencyMismatchError`.
- Transfer: `accountId ≠ counterpartyAccountId`, ambas del mismo workspace, **misma currency**.
- Canje (`fx_debit` / `fx_credit`): ver `CurrencyExchange`; no cuentan en cashflow ni budget spent.
- Income/expense: `accountId` del mismo workspace personal (SPEC-14 retirada; no hay cuenta foreign de otro tenant).
- Un expense puede tener **como máximo un** `ExpenseSplit` (1:1 por `expenseTransactionId`). El split **no** es un campo `splitId` en Transaction: la FK vive en `ExpenseSplit`.
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

### CrossWorkspaceLink (retirado — KRI-29)

Vínculo 1↔1 entre dos transacciones de workspaces distintos (aporte / fondeo). **No forma parte del producto** (SPEC-14 retirada; ADR-007). Tabla, enum, servicios, UI y errores (`WorkspaceHasCrossLinks`, `AccountHasCrossWorkspaceLinksError`, `SameWorkspaceContributionError`) se **eliminan** en el mismo epic que SPEC-09. No hay twins ni cuentas foreign.

El IOU interpersonal **no** es un CrossWorkspaceLink: es `ExpenseSplit` anclado a `SplitGroup`.

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
- Goal `status=active` con `linkedAccountId` set: **bloquea** `ArchiveAccount` y `DeleteAccount` de esa cuenta (`AccountLinkedToActiveGoal`, SPEC-03). Goals `completed` / `cancelled` no bloquean; en hard-delete de la **cuenta** se nullifica `linkedAccountId`.
- `UpdateGoal` (SPEC-08 FR-08): no cambia `currency`; `cancelled` no se edita; bajar `target` ≤ `current` completa; subir `target` sobre `current` reabre `completed` → `active`.
- `DeleteGoal` (SPEC-08 FR-09): hard-delete del Goal + cascade de `GoalContribution`; las transfers del aporte **permanecen** en el ledger. Confirmación por nombre.

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

### SplitGroup (círculo de gastos — SPEC-09, ADR-007)

No es un Workspace. Dueño de datos = `workspaceId` del creador (personal). Otros **user-miembros** acceden por `SplitGroupMember`, no por `Membership` del tenant de Ana. Invariantes profundas y TDD: [SPEC-10](./specs/10-expense-splitting.md). Schema: SPEC-10 §12.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | tenant **personal del creador**. No se switch-ea |
| name | string | trim, 1…80; único dato de producto del círculo (sin tipo) |
| currency | CurrencyCode | freeze = `workspace.baseCurrency` al crear; inmutable |
| publicShareToken | string | único, unguessable; vista pública **y** join v1 |
| createdByUserId | Id | al crear queda miembro `kind=user` |

**Invariantes**

- Rename y delete solo `createdByUserId`.
- Token inválido → error opaco (no filtrar otros grupos).
- Delete del grupo: cascade members/splits/settlements; las txs de ledger de cada payer **permanecen**. El servicio borra splits/settlements **antes** de miembros (FKs Restrict).

### SplitGroupMember

Identidad en shares, payer, nets y settlements = **`id` (`memberId`)**. Nunca `User.id`.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | `memberId` |
| splitGroupId | Id | |
| kind | `user` \| `ghost` | ghost = solo nombre, sin User |
| userId | Id? | required iff `user`; null iff `ghost` |
| displayName | string | ghosts: nombre cargado; users: snapshot al unirse |
| displayNameKey | string? | `lower(trim(displayName))` solo ghosts; unique por grupo |

**Invariantes**

- Creador queda como miembro `user` al crear el grupo.
- Ghost: sin `userId`; no inicia sesión; igual entra en `allocate*` y nets; **no** puede ser payer (`GhostCannotPayError`).
- Ghosts homónimos (trim, case-insensitive) en el mismo grupo → `DuplicateGhostNameError`. Ghost “Juan” + user Juan pueden coexistir hasta H11.
- `userId` único por grupo (`AlreadySplitGroupMemberError`).
- Un User **no** necesita Membership en el workspace de Ana para ser miembro.
- Rename de displayName: ghost → cualquier user-miembro (unicidad homónima); user → uno mismo o el creador.
- Baja: no el creador (`CannotRemoveGroupCreatorError`). No si hay shares, pagos o settlements (`MemberHasSplitHistoryError`). Ghost: cualquier user-miembro. User no creador: puede irse.
- H11 later: el ghost se **reclama** mutando la misma fila (`kind=user`, set `userId`) para conservar `memberId` histórico.

### ExpenseSplit (gasto compartido — SPEC-10)

Distribución de un expense entre miembros del `SplitGroup`. La tx vive en el personal **del que registra**; el split se ancla al grupo (tenant del creador). Eso **cruza tenants a nivel FK**, no comparte el ledger.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| splitGroupId | Id | |
| expenseTransactionId | Id | unique; v1 required; `onDelete: Cascade` |
| paidByMemberId | Id | miembro `kind=user` del registrador |
| method | `equal` \| `percentage` \| `exact` | default producto = `equal` |
| shares | SplitShare[] | |

```ts
type SplitShare = {
  memberId: Id
  shareCents: number // entero >= 0
}
```

**Invariantes**

- `Σ shareCents === expense.amountCents` (`SplitSumMismatchError`).
- `expense.currency === splitGroup.currency` (`SplitCurrencyMismatchError`). Sin FX.
- `expense.type = expense`; se crea en `registrar.personalWorkspaceId`, que **puede** ≠ `splitGroup.workspaceId` (T-09).
- Equal: participantes = **todos** los miembros actuales; `n >= 2`. Remainder: +1 a los primeros N por `memberId` asc (SPEC-10).
- Exact/percentage: cada `memberId` es miembro actual; subset permitido (implícito 0).
- Payer v1 = registrador; ghost no paga.
- Delete del expense: cascade split+shares; settlements no se tocan.
- **Derivado (detalle autenticado):** gastos del grupo por categoría = Σ `expense.amountCents` de los splits, agrupados por `categoryId` de la tx (SPEC-09 FR-11 / SPEC-10 T-24). Settlements no entran. Vista pública no expone categorías.

### Settlement

Pago entre miembros de un `SplitGroup` para ajustar nets (no mueve el ledger de cuentas).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| splitGroupId | Id | |
| fromMemberId | Id | quien “paga” la deuda de split |
| toMemberId | Id | quien cobra |
| amount | Money | `amountCents > 0`; currency = la del grupo |
| occurredOn | Date | |
| createdByUserId | Id | miembro `user` que registra (puede ser Ana registrando que el ghost Juan pagó) |

**Invariantes**

- `from ≠ to`; ambos miembros actuales del mismo grupo. Ghosts permitidos como parties.
- Semántica de nets: SPEC-10 §5.4. v1 no topea al saldo de la pareja.
- Lectura de producto: **net por miembro** (positivo = le deben). Grafo mínimo de transferencias = later.

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
| SplitGroup | SplitGroup | members, ExpenseSplit[], Settlement[] |
| ExpenseSplit | ExpenseSplit | shares |
| RecurringRule | RecurringRule | — (ocurrencias son proyecciones; materializaciones viven bajo `Transaction`) |

Los saldos de cuenta y balances entre miembros son **lecturas derivadas**, no estado mutable independiente (salvo settlements que ajustan el ledger de deudas).

## Reglas transversales

1. Autorización: mutaciones de **ledger** verifican Membership + role del workspace **personal del actor**. Mutaciones de `SplitGroup` verifican `SplitGroupMember` `kind=user` (rename/delete del grupo: además `createdByUserId`). El visitante del link público solo lee una proyección (ADR-007). **Prohibido** exigir membership en el tenant de Ana para que Bob vea el grupo.
2. Soft-delete / archive preferido a hard-delete cuando hay historial.
   - **Excepción histórica (SPEC-02):** hard-delete de workspace `group`. **KRI-29 / ADR-007** retira el tipo group; la migración borra esos tenants. El workspace `personal` no se elimina.
   - **Excepción (SPEC-03):** `DeleteAccount` — hard-delete de cuenta con confirmación fuerte y cascada de servicio; Archive sigue siendo el camino recomendado.
   - Delete de expense con split: cascade del `ExpenseSplit` (SPEC-10 T-10).
3. Idempotencia: comandos de creación pueden aceptar `clientRequestId` (fase P1+).
4. Multi-moneda (ADR-006): cuentas ARS|USD; ledger nativo por moneda; canje explícito (`CurrencyExchange`); patrimonio consolidado solo con tasa manual del workspace. `baseCurrency` = consolidación y defaults — no única moneda permitida. Splits: moneda del grupo freeze; sin FX en el IOU.
5. **Input de monto (KRI-33):** el usuario escribe unidades con **coma** decimal (`es-AR`). El punto se acepta y se normaliza a coma. El parseo a `amountCents` vive en `src/domain/money/parse-amount.ts` (entero, ADR-001). La UI no usa `type="number"`.
