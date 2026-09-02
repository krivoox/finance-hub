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
- En `credit_card` (convención SPEC-03): la polaridad del efecto se invierte al derivar saldo
  - Tarjeta como **destino** = pago → **baja** la deuda
  - Tarjeta como **origen** = cash advance → **sube** la deuda
  - El comando sigue siendo `CreateTransfer` (no hay tipo `payment`)

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

### T-05 Pago de tarjeta (destino credit_card)

- **Given** checking 10000; credit_card deuda 8000  
- **When** transfer 3000 checking → credit_card  
- **Then** checking=7000; credit_card deuda=5000; type=`transfer`

### T-06 Cash advance (origen credit_card)

- **Given** credit_card deuda 0; cash 0  
- **When** transfer 2000 credit_card → cash  
- **Then** credit_card deuda=2000; cash=2000

## 8. Fuera de alcance

- Transferencias `type=transfer` entre workspaces (no relajar FR-02)
- Aportes / fondeo entre espacios → ver [SPEC-14](./14-cross-workspace-money.md) (`CreateCrossWorkspaceContribution`)
- Gastos del hogar pagados con cuenta personal → SPEC-14 (expense con account foreign)
- Canje cross-currency / fees → [SPEC-16](./16-currency-exchange.md)
- Tip en sheet “Nuevo movimiento” al elegir tarjeta (P1)
- Preferencias de tips en servidor / sync entre dispositivos

## 9. Notas

- UI genérica: formulario “Nuevo movimiento” → tipo Transferencia; labels “Cuenta origen” / “Cuenta destino”.
- UI dedicada: `/accounts` → **Pagar** abre FormSheet “Pagar tarjeta” (destino locked, origen seleccionable, monto default = deuda) y llama `createTransferAction`.
- Un **Ingreso** registrado sobre la tarjeta también baja deuda (SPEC-03) pero no descuenta otra cuenta: no es el flujo recomendado para pagar el resumen.
- Un **Ajuste** (SPEC-22) corrige deuda/saldo de **esta** cuenta sin mover otra: no es pagar el resumen.

## 10. Relación con objetivos (SPEC-08 H4)

`ContributeToGoal` **crea** una transfer (origen elegido → `goal.linkedAccountId`) bajo las mismas invariantes de esta spec (misma moneda, cuentas activas, sin categoría, no afecta budgets).

- No hay `TransactionType` nuevo: el listado sigue filtrando `type=transfer`.
- La señal “aporte a objetivo” es metadata vía `GoalContribution.transactionId` (badge en DTO), no un tipo distinto.
- `debt_payoff` con destino `credit_card` = pago de deuda vía transfer (mismo efecto T-05).
- Delete/update de transfers ligadas a goal: reglas en SPEC-08 §4.3 (`TransferLinkedToGoal` / cascada undo).

## 11. Relación con recurrentes (SPEC-18)

Las transferencias pueden materializarse desde una plantilla recurrente ([SPEC-18](./18-recurring-transactions.md)). Al confirmar una ocurrencia de tipo `transfer` se aplica el mismo comando conceptual que `CreateTransfer` (mismas invariantes: misma moneda, cuentas activas, sin categoría). La señal “recurrente” es metadata vía `Transaction.recurringRuleId` (indicador en DTO), no un tipo distinto.
