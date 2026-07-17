# Spec 06 — Transferencias

| Campo | Valor |
|-------|-------|
| ID | SPEC-06 |
| Estado | Draft |
| Prioridad | P0 |
| Dependencias | SPEC-03, SPEC-05 |

## 1. Contexto

Una transferencia mueve valor entre dos cuentas del mismo workspace sin ser ingreso ni gasto (no afecta presupuestos de expense).

## 2. Historias de usuario

1. Quiero transferir dinero de mi cuenta sueldo a mi cuenta ahorro.
2. Quiero ver la transferencia como un único movimiento lógico (no dos gastos).
3. Quiero editar o anular una transferencia.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Create transfer: origen, destino, monto, fecha, descripción opcional |
| FR-02 | Ambas cuentas mismo workspace, activas, currencies iguales |
| FR-03 | Efecto: −amount origen, +amount destino |
| FR-04 | Update / Delete coherentes en ambas puntas |
| FR-05 | List aparece como type=`transfer` |

## 4. Reglas de negocio

- `accountId ≠ counterpartyAccountId`
- **Currencies iguales** (same-currency only). Canje ARS↔USD → [SPEC-16](./16-currency-exchange.md)
- Sin category (o category null)
- No cuenta como spent en budgets
- En credit_card: definir efecto según convención de deuda (tests)

## 5. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Command | `CreateTransfer` |
| Command | `UpdateTransfer` |
| Command | `DeleteTransfer` |

## 6. Criterios de aceptación

- [ ] Suma de balances del workspace (asset accounts) no cambia por una transfer entre assets.
- [ ] Fallo si destino archivado.

## 7. Escenarios de test (TDD)

### T-01 Transfer entre checkings

- **Given** A=10000, B=0  
- **When** transfer 4000 A→B  
- **Then** A=6000, B=4000; type=transfer

### T-02 Misma cuenta

- **When** origen=destino  
- **Then** error `SameAccountTransfer`

### T-03 Delete restaura

- **Given** transfer 4000  
- **When** delete  
- **Then** saldos originales

### T-04 No afecta budget

- **Given** budget en categoría comida  
- **When** transfer  
- **Then** spent del budget sin cambio

## 8. Fuera de alcance

- Transferencias `type=transfer` entre workspaces (no relajar FR-02)
- Aportes / fondeo entre espacios → ver [SPEC-14](./14-cross-workspace-money.md) (`CreateCrossWorkspaceContribution`)
- Gastos del hogar pagados con cuenta personal → SPEC-14 (expense con account foreign)
- Canje cross-currency / fees → [SPEC-16](./16-currency-exchange.md)
