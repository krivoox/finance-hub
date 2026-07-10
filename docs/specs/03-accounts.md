# Spec 03 — Cuentas

| Campo | Valor |
|-------|-------|
| ID | SPEC-03 |
| Estado | Draft |
| Prioridad | P0 |
| Dependencias | SPEC-02 |

## 1. Contexto

Las cuentas representan dónde está el dinero (o deuda, en tarjetas de crédito). El saldo es derivado.

## 2. Actores

- Owner, Admin, Member (escritura)
- Viewer (lectura)

## 3. Historias de usuario

1. Quiero crear cuentas de distintos tipos con saldo inicial.
2. Quiero ver el saldo actual de cada cuenta.
3. Quiero archivar una cuenta que ya no uso sin perder historial.
4. Quiero editar nombre y, en crédito, el límite.

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Crear account con type, currency, initialBalance |
| FR-02 | Listar accounts activas (y opción incluir archivadas) |
| FR-03 | Calcular `currentBalance` = initial + efectos de txs |
| FR-04 | Actualizar name; creditLimit si type=credit_card |
| FR-05 | Archivar / desarchivar |
| FR-06 | Rechazar nuevas txs en cuenta archivada |

## 5. Reglas de negocio

- MVP: `currency` debe igualar `workspace.baseCurrency` (sin FX).
- `initialBalance` puede ser 0.
- Credit card: saldo positivo = deuda (convención documentada en dominio: balance de crédito representa lo adeudado; expenses en crédito aumentan deuda).
- No hard-delete si hay transacciones.
- Nombre no vacío, max 80 chars.

### Convención de saldo en credit_card

- `currentBalance >= 0` significa monto adeudado.
- Un expense en la tarjeta **aumenta** el balance (más deuda).
- Un payment (expense desde checking hacia reducir deuda, o tipo específico) se modela en SPEC-06 / ajustes; en MVP, un income/payment category en la tarjeta **disminuye** deuda.

Documentar en código con tests explícitos.

## 6. Comandos y consultas

| Tipo | Nombre | Input | Output |
|------|--------|-------|--------|
| Command | `CreateAccount` | workspaceId, name, type, currency, initialBalanceCents, creditLimitCents? | Account |
| Command | `UpdateAccount` | accountId, name?, creditLimitCents? | Account |
| Command | `ArchiveAccount` | accountId | Account |
| Command | `UnarchiveAccount` | accountId | Account |
| Query | `ListAccounts` | workspaceId, includeArchived? | AccountWithBalance[] |
| Query | `GetAccount` | accountId | AccountWithBalance |

## 7. Criterios de aceptación

- [ ] Saldo refleja income/expense/transfer correctamente (tests).
- [ ] Cuenta archivada no acepta CreateTransaction.
- [ ] Currency distinta a baseCurrency → error en MVP.

## 8. Escenarios de test (TDD)

### T-01 Crear y saldo inicial

- **Given** workspace ARS  
- **When** create checking con 10_000 centavos  
- **Then** currentBalance = 10000

### T-02 Currency mismatch

- **Given** workspace ARS  
- **When** create account USD  
- **Then** error `CurrencyMismatch`

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
- Multi-currency / FX
- Cuentas de inversión

## 10. Notas

Servicio de dominio `calculateAccountBalance(account, transactions)` puro y testeable.
