# Spec 05 — Transacciones (ingresos y gastos)

| Campo | Valor |
|-------|-------|
| ID | SPEC-05 |
| Estado | Draft |
| Prioridad | P0 |
| Dependencias | SPEC-03, SPEC-04 |

## 1. Contexto

Ingresos y gastos son el núcleo del ledger. Las transferencias se especifican en SPEC-06.

## 2. Historias de usuario

1. Quiero registrar un gasto en una cuenta con categoría, monto y fecha.
2. Quiero registrar un ingreso.
3. Quiero editar o eliminar un movimiento reciente.
4. Quiero filtrar movimientos por cuenta, categoría, rango de fechas y tipo.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Create income / expense |
| FR-02 | Update description, category, amount, date, account (con recálculo de saldos) |
| FR-03 | Delete (hard en MVP si no hay split; si hay split, ver SPEC-10) |
| FR-04 | List con filtros y paginación |
| FR-05 | amount > 0; currency = account.currency |

## 4. Reglas de negocio

- `occurredOn` no puede ser > hoy + 1 día (timezone del user) — tolerancia clock skew.
- Categoría requerida y compatible con type.
- Account activa. Por defecto del mismo workspace; si la cuenta es de otro workspace del usuario, ver [SPEC-14](./14-cross-workspace-money.md) (expense/income funded externo).
- Transferencias siguen exigiendo cuentas del mismo workspace ([SPEC-06](./06-transfers.md)).
- Member puede crear; viewer no.
- Editar amount/account recalcula balances derivados (no hay campo balance mutable).

## 5. Comandos y consultas

| Tipo | Nombre | Input destacado |
|------|--------|-----------------|
| Command | `CreateIncome` | accountId, categoryId, amountCents, occurredOn, description? |
| Command | `CreateExpense` | igual |
| Command | `UpdateTransaction` | campos mutables |
| Command | `DeleteTransaction` | transactionId |
| Query | `ListTransactions` | filters, cursor |
| Query | `GetTransaction` | id |

## 6. Criterios de aceptación

- [ ] Expense reduce saldo de cuenta asset; income lo aumenta.
- [ ] Validaciones de categoría/cuenta fallan con errores de dominio claros.
- [ ] List ordenado por `occurredOn` desc, luego `createdAt` desc.

## 7. Escenarios de test (TDD)

### T-01 Create expense

- **Given** account 10000, category expense  
- **When** expense 3000  
- **Then** tx creada; balance 7000

### T-02 Create income

- **Given** account 10000  
- **When** income 5000  
- **Then** balance 15000

### T-03 Amount cero o negativo

- **When** amountCents <= 0  
- **Then** error `InvalidAmount`

### T-04 Category kind mismatch

- **Given** category income  
- **When** CreateExpense  
- **Then** error `CategoryKindMismatch`

### T-05 Update amount

- **Given** expense 3000 (balance quedó 7000)  
- **When** update a 2000  
- **Then** balance 8000

### T-06 Delete

- **Given** expense 3000  
- **When** delete  
- **Then** balance restaurado; tx no listada

### T-07 Archived account

- **When** create en archived  
- **Then** error `AccountArchived`

## 8. Fuera de alcance

- Adjuntos / OCR de tickets
- Recurrencia automática (fase P2)
- Multi-currency

## 9. Notas

Preferir un modelo único `Transaction` con `type` discriminado; tests cubren cada variante.

Detalle de UI: [SPEC-13](./13-transaction-detail.md). Dinero entre workspaces: [SPEC-14](./14-cross-workspace-money.md).
