# Spec 03 — Cuentas

| Campo | Valor |
|-------|-------|
| ID | SPEC-03 |
| Estado | Draft |
| Prioridad | P0 |
| Dependencias | SPEC-02 |

## 1. Contexto

Las cuentas representan dónde está el dinero (o deuda, en tarjetas de crédito). El saldo es derivado. Un workspace puede tener cuentas en **ARS y USD** (multi-ledger); la moneda de la cuenta es fija.

## 2. Actores

- Owner, Admin, Member (escritura)
- Viewer (lectura)

## 3. Historias de usuario

1. Quiero crear cuentas de distintos tipos con saldo inicial.
2. Quiero crear una cuenta en dólares en un workspace en pesos.
3. Quiero ver el saldo actual de cada cuenta en su moneda.
4. Quiero archivar una cuenta que ya no uso sin perder historial.
5. Quiero editar nombre y, en crédito, el límite.

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Crear account con type, currency (ARS\|USD), initialBalance |
| FR-02 | Listar accounts activas (y opción incluir archivadas); agrupar/mostrar por moneda |
| FR-03 | Calcular `currentBalance` = initial + efectos de txs **solo en la moneda de la cuenta** |
| FR-04 | Actualizar name; creditLimit si type=credit_card (currency **inmutable**) |
| FR-05 | Archivar / desarchivar |
| FR-06 | Rechazar nuevas txs en cuenta archivada |

## 5. Reglas de negocio

- `currency ∈ { ARS, USD }` (`ACCOUNT_CURRENCIES`). Puede diferir de `workspace.baseCurrency`.
- `currency` es **inmutable** tras CreateAccount.
- Default de currency al crear = `workspace.baseCurrency` si no se envía.
- `initialBalance` puede ser 0 (en la moneda de la cuenta).
- Credit card: saldo positivo = deuda (convención documentada en dominio).
- No hard-delete si hay transacciones.
- Nombre no vacío, max 80 chars.

### Convención de saldo en credit_card

- `currentBalance >= 0` significa monto adeudado.
- Un expense en la tarjeta **aumenta** el balance (más deuda).
- Un income/payment en la tarjeta **disminuye** deuda.

Documentar en código con tests explícitos.

## 6. Comandos y consultas

| Tipo | Nombre | Input | Output |
|------|--------|-------|--------|
| Command | `CreateAccount` | workspaceId, name, type, currency?, initialBalanceCents, creditLimitCents? | Account |
| Command | `UpdateAccount` | accountId, name?, creditLimitCents? | Account |
| Command | `ArchiveAccount` | accountId | Account |
| Command | `UnarchiveAccount` | accountId | Account |
| Query | `ListAccounts` | workspaceId, includeArchived? | AccountWithBalance[] |
| Query | `GetAccount` | accountId | AccountWithBalance |

## 7. Criterios de aceptación

- [ ] Saldo refleja income/expense/transfer/fx_* correctamente (tests).
- [ ] Cuenta archivada no acepta CreateTransaction.
- [ ] Currency no whitelisted → error `UnsupportedAccountCurrency`.
- [ ] Cuenta USD en workspace ARS → OK.

## 8. Escenarios de test (TDD)

### T-01 Crear y saldo inicial

- **Given** workspace ARS  
- **When** create checking ARS con 10_000 centavos  
- **Then** currentBalance = 10000 ARS

### T-02 Currency no soportada

- **Given** workspace ARS  
- **When** create account EUR  
- **Then** error `UnsupportedAccountCurrency`

### T-02b Cuenta USD en workspace ARS

- **Given** workspace ARS  
- **When** create account USD  
- **Then** account creada con currency=USD

### T-03 Saldo tras expense

- **Given** account 10000  
- **When** expense 2500  
- **Then** balance 7500

### T-04 Archivar bloquea txs

- **Given** account archived  
- **When** create expense  
- **Then** error `AccountArchived`

### T-05 Credit card debt

- **Given** credit balance 0  
- **When** expense 5000 en la tarjeta  
- **Then** balance (deuda) = 5000

## 9. Fuera de alcance

- Conciliación bancaria
- Canje ARS↔USD → [SPEC-16](./16-currency-exchange.md)
- Cuentas de inversión
- Monedas fuera de ARS\|USD
- Cambiar currency de una cuenta con historial

## 10. Notas

Servicio de dominio `calculateAccountBalance(account, transactions)` puro y testeable.
Transferencias same-currency: [SPEC-06](./06-transfers.md). Canje: [SPEC-16](./16-currency-exchange.md).
