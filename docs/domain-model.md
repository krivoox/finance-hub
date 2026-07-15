# Modelo de dominio

Lenguaje ubicuo en inglés en código; términos de negocio en español en docs.

## Diagrama de relaciones (conceptual)

```text
User
  └── Membership ──► Workspace
                        ├── Account
                        ├── Category
                        ├── Transaction (Income | Expense | Transfer)
                        ├── Budget
                        ├── Goal
                        └── (si es grupal) Split / Settlement
```

## Entidades

### User

Persona autenticada.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| email | Email | único |
| displayName | string | |
| preferredCurrency | CurrencyCode | default del usuario |
| timezone | IANA timezone | para periodos |
| createdAt | DateTime | |

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
- Cuentas archivadas no aceptan nuevas transacciones.

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
| type | `income` \| `expense` \| `transfer` | |
| amount | Money | siempre > 0 |
| occurredOn | Date | fecha contable |
| description | string? | |
| categoryId | Id? | requerido en income/expense; null en transfer pura |
| accountId | Id | cuenta principal (origen en transfer) |
| counterpartyAccountId | Id? | destino en transfer |
| createdByUserId | Id | |
| splitId | Id? | si participa en gasto compartido |

**Invariantes**

- `amount.currency` debe coincidir con la cuenta afectada (MVP: sin FX).
- Transfer: `accountId ≠ counterpartyAccountId`, ambas del mismo workspace.
- Income/expense: `accountId` puede ser de otro workspace del mismo usuario (funded externo, SPEC-14); el `workspaceId` de la tx es el contexto de registro (categorías, budgets, splits).
- No se puede borrar una cuenta con transacciones (archivar).

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
| currentAmount | Money | aportado / pagado |
| targetDate | Date? | |
| linkedAccountId | Id? | opcional |
| status | `active` \| `completed` \| `cancelled` | |

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

## Agregados sugeridos

| Agregado | Raíz | Contiene |
|----------|------|----------|
| Workspace | Workspace | Memberships (o agregado aparte) |
| Account | Account | — |
| Transaction | Transaction | — |
| Budget | Budget | — |
| Goal | Goal | — |
| Split | Split | shares |

Los saldos de cuenta y balances entre miembros son **lecturas derivadas**, no estado mutable independiente (salvo settlements que ajustan el ledger de deudas).

## Reglas transversales

1. Autorización: toda mutación verifica Membership + role.
2. Soft-delete / archive preferido a hard-delete cuando hay historial.
3. Idempotencia: comandos de creación pueden aceptar `clientRequestId` (fase P1+).
4. MVP sin conversión de divisas: un workspace opera en `baseCurrency`; cuentas en otra moneda quedan fuera o bloqueadas hasta FX.
