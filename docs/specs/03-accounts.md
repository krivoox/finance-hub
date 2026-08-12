# Spec 03 — Cuentas

| Campo | Valor |
|-------|-------|
| ID | SPEC-03 |
| Estado | Draft |
| Prioridad | P0 |
| Dependencias | SPEC-02 |

## 1. Contexto

Las cuentas representan dónde está el dinero (o deuda, en tarjetas de crédito). El saldo es derivado. Un workspace puede tener cuentas en **ARS y USD** (multi-ledger); la moneda de la cuenta es fija.

### 1.1 Tarjetas de crédito bimonetarias (KRI-11)

En Argentina es habitual que **una misma tarjeta física** acumule consumos en **ARS y USD** (resumen local + consumos en dólares / exterior). El usuario necesita:

1. Configurar y crear la tarjeta **con la misma paridad de flujo** que un banco/billetera (nombre, moneda, saldo/deuda inicial, límite opcional).
2. Registrar cada gasto en la **moneda que corresponde**.
3. Ver deuda ARS y deuda USD por separado para pagar y controlar con precisión.

**Decisión de producto (alineada a ADR-006):** una tarjeta física con dos monedas = **dos `Account` de tipo `credit_card`**, una por moneda. No hay cuenta multi-moneda. Ver §5.1.

## 2. Actores

- Owner, Admin, Member (escritura)
- Viewer (lectura)

## 3. Historias de usuario

1. Quiero crear cuentas de distintos tipos con saldo inicial.
2. Quiero crear una cuenta en dólares en un workspace en pesos.
3. Quiero ver el saldo actual de cada cuenta en su moneda.
4. Quiero archivar una cuenta que ya no uso sin perder historial.
5. Quiero editar nombre y, en crédito, el límite.
6. **(P0 / KRI-11)** Como member, quiero crear una tarjeta de crédito en ARS o en USD **igual que un banco** (nombre, moneda, deuda inicial, límite opcional), para llevar la deuda en esa moneda.
7. **(P0 / KRI-11)** Como member, quiero registrar un gasto en la tarjeta de la moneda correcta, para que la deuda ARS y la USD no se mezclen.
8. **(P0 / KRI-11)** Como member, quiero pagar la deuda de cada tarjeta-moneda con una transferencia same-currency hacia esa cuenta, para bajar solo la deuda de esa moneda.
9. **(P1 / KRI-11)** Como member, al crear una tarjeta quiero un atajo “también crear en la otra moneda”, para no olvidar el ledger USD/ARS compañero.
10. **(P2)** Como member, quiero ver agrupadas en listado las dos patas de la misma tarjeta física, para reconocerlas como un solo instrumento.

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Crear account con type, currency (ARS\|USD), initialBalance |
| FR-02 | Listar accounts activas (y opción incluir archivadas); agrupar/mostrar por moneda |
| FR-03 | Calcular `currentBalance` = initial + efectos de txs **solo en la moneda de la cuenta** |
| FR-04 | Actualizar name; creditLimit si type=credit_card (currency **inmutable**) |
| FR-05 | Archivar / desarchivar |
| FR-06 | Rechazar nuevas txs en cuenta archivada |
| FR-07 | **Paridad tarjeta ↔ banco:** `CreateAccount` / `UpdateAccount` / archive / expense / income / transfer-pago aplican a `credit_card` sin restricciones extra de moneda (solo las de ADR-006) |
| FR-08 | Al crear/editar `credit_card`, la UI expone `creditLimitCents` opcional (misma currency que la cuenta) y copy de **deuda** (no “saldo a favor”) |
| FR-09 | Hint de producto al elegir `credit_card`: si la tarjeta gasta en ARS y USD, crear **una cuenta por moneda** |
| FR-10 | **(P1)** Atajo opcional al crear `credit_card`: crear cuenta compañera en la otra moneda (`ACCOUNT_CURRENCIES` restante) con nombre sugerido (`{name} ARS` / `{name} USD`) — dos `CreateAccount` independientes; sin entidad de vínculo en MVP |

## 5. Reglas de negocio

- `currency ∈ { ARS, USD }` (`ACCOUNT_CURRENCIES`). Puede diferir de `workspace.baseCurrency`.
- `currency` es **inmutable** tras CreateAccount.
- Default de currency al crear = `workspace.baseCurrency` si no se envía.
- `initialBalance` puede ser 0 (en la moneda de la cuenta). En `credit_card`, el initialBalance es **deuda inicial** (mismo signo: positivo = adeudado).
- Credit card: saldo positivo = deuda (convención documentada en dominio).
- No hard-delete si hay transacciones.
- Nombre no vacío, max 80 chars.
- `creditLimitCents` solo en `credit_card`; opcional; positivo; **misma currency** que la cuenta (no hay límite “global” multi-moneda en una sola Account).

### 5.1 Modelado de tarjeta ARS + USD (decisión KRI-11)

| Enfoque | Descripción | Decisión |
|---------|-------------|----------|
| **A — Dos Accounts** (recomendado) | Una `credit_card` ARS + una `credit_card` USD por la misma plástico | **Elegido** |
| B — Una Account multi-moneda | Un id con balances ARS y USD | Rechazado: contradice ADR-006 (ledger nativo, currency fija) |
| C — Entidad Card + ledgers hijos | Agregado `CardProduct` que agrupa Accounts | Later (P2): mejora UX de listado; no bloquea control preciso |

**Consecuencias de A:**

- Gasto en pesos → `CreateExpense` en la cuenta `credit_card` ARS.
- Gasto en dólares → `CreateExpense` en la cuenta `credit_card` USD.
- Pago del resumen ARS → `CreateTransfer` same-currency hacia la pata ARS ([SPEC-06](./06-transfers.md) T-05).
- Pago del tramo USD → transfer same-currency hacia la pata USD (desde una cuenta asset USD), **o** canje + pago en dos pasos si solo hay liquidez ARS ([SPEC-16](./16-currency-exchange.md)) — el canje **no** es automático al pagar la tarjeta.
- Límites: uno por Account/moneda (FR-04 / FR-08). Si el emisor publica un solo límite, el usuario lo carga en la moneda principal o lo reparte; no inventamos conversión automática del límite.
- Naming sugerido (producto, no invariante): `"Visa Quiero ARS"` / `"Visa Quiero USD"`.
- **No** hay vínculo persistido entre las dos patas en MVP (FR-10 crea dos Accounts sueltas). Agrupación visual = P2.

### Convención de saldo en credit_card

- `currentBalance >= 0` significa monto adeudado (no se modela la deuda como saldo negativo).
- Un expense en la tarjeta **aumenta** el balance (más deuda).
- Un income en la tarjeta **disminuye** deuda (ajuste/crédito; **no** mueve liquidez de otra cuenta).
- **Pago típico del resumen:** transferencia same-currency **hacia** la tarjeta (origen = banco/efectivo/billetera, destino = `credit_card`) → baja la deuda y descuenta el origen ([SPEC-06](./06-transfers.md)).
- Transferencia **desde** la tarjeta (origen = tarjeta) → aumenta deuda (adelanto en efectivo).

Documentar en código con tests explícitos (`calculateAccountBalance`).

**UI:** en `/accounts`, filas `credit_card` con deuda > 0 ofrecen CTA **Pagar** (FormSheet → `CreateTransfer` origen asset → tarjeta). Tip contextual dismissible (`tip.credit_card_pay`, localStorage `fh:tips:v1`). Alternativa manual: Transacciones → Transferencia.

**Paridad UI con banco (KRI-11 P0):** el formulario de alta debe permitir `type=credit_card` + `currency` ARS|USD + deuda inicial + límite opcional, sin forzar `baseCurrency` ni ocultar USD. Copy: “Deuda inicial” / “Límite de crédito” cuando `type=credit_card`; “Saldo inicial” en el resto.

**ArchiveAccount + recurrentes (SPEC-18):** al archivar una cuenta, toda `RecurringRule` activa del mismo workspace que use esa cuenta como `accountId` o `counterpartyAccountId` pasa a `paused` con `pausedReason = account_archived`. Desarchivar **no** reactiva esas reglas.

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
- [ ] **KRI-11:** Crear `credit_card` ARS y `credit_card` USD en el mismo workspace → ambas OK; deudas independientes.
- [ ] **KRI-11:** Expense en tarjeta USD no altera deuda de tarjeta ARS (y viceversa).
- [ ] **KRI-11:** Pagar tarjeta ARS con transfer desde checking ARS baja solo esa deuda (SPEC-06 T-05).
- [ ] **KRI-11:** UI de alta de tarjeta permite moneda ARS|USD, deuda inicial y límite opcional (paridad con banco).
- [ ] **KRI-11:** Hint visible al elegir tipo tarjeta sobre el patrón “una cuenta por moneda”.
- [ ] Viewer no puede crear/editar; member+ sí (roles SPEC-02).

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

### T-06 Credit card USD en workspace ARS (KRI-11)

- **Given** workspace baseCurrency=ARS  
- **When** create `credit_card` currency=USD, initialBalanceCents=0, creditLimitCents=500_000  
- **Then** account creada; type=credit_card; currency=USD; creditLimitCents=500_000; currentBalance=0

### T-07 Deudas ARS y USD independientes (KRI-11)

- **Given** credit_card “Visa ARS” (ARS, deuda 0) y credit_card “Visa USD” (USD, deuda 0)  
- **When** expense 10_000 ARS en Visa ARS; expense 2_500 USD en Visa USD  
- **Then** Visa ARS deuda=10000; Visa USD deuda=2500; ninguna afecta a la otra

### T-08 Pago solo de la pata ARS (KRI-11)

- **Given** Visa ARS deuda 8000; Visa USD deuda 3000; checking ARS 20000  
- **When** transfer 5000 checking ARS → Visa ARS  
- **Then** Visa ARS=3000; Visa USD=3000 (sin cambio); checking=15000

### T-09 creditLimit rechazado en no-tarjeta

- **Given** type=checking  
- **When** CreateAccount con creditLimitCents=1000  
- **Then** error de dominio / validación (InvalidCreditLimit)

## 9. Fuera de alcance

- Conciliación bancaria
- Canje ARS↔USD → [SPEC-16](./16-currency-exchange.md)
- Cuentas de inversión
- Monedas fuera de ARS\|USD
- Cambiar currency de una cuenta con historial
- **Cuenta `credit_card` multi-moneda** (un solo Account con dos ledgers) — rechazado (ADR-006)
- Entidad `CardProduct` / vínculo persistido entre patas ARS+USD (P2)
- Fecha de cierre / vencimiento del resumen, pago mínimo, intereses, cuotas
- Impuestos automáticos sobre consumos USD (PAIS, Ganancias, IVA/IIBB) — ver SPEC-19 fuera de alcance
- Sync open banking / extracto del emisor
- Conversión automática del límite de crédito entre monedas
- Pago de tramo USD con liquidez solo ARS en un solo comando (debe ser canje explícito + transfer, o transfer desde asset USD)

## 10. Notas

Servicio de dominio `calculateAccountBalance(account, transactions)` puro y testeable.
Transferencias same-currency: [SPEC-06](./06-transfers.md). Canje: [SPEC-16](./16-currency-exchange.md).

### Hand-off técnico (KRI-11)

| Capa | Qué tocar |
|------|-----------|
| **Domain** | Sin cambio de invariantes de saldo si T-05/T-06 ya verdes; agregar escenarios T-06…T-09 si faltan. `assertValidCreditLimit` ya existe. |
| **Prisma / schema** | Sin migración nueva: `FinanceAccount.type`, `currency`, `creditLimitCents` ya modelan el caso. |
| **Services / actions** | Paridad `CreateAccount`/`UpdateAccount` para credit_card USD; opcional comando compuesto P1 “crear par” = dos creates (o action que orquesta). |
| **Schemas (Zod)** | Ya aceptan `creditLimitCents` en create; asegurar UI lo envía. |
| **UI** | Form alta/edición: límite + copy deuda; hint bimonetaria; P1 checkbox compañera; listado CTA Pagar por pata. Mobile-first. |
| **Docs** | Este delta SPEC-03; glosario “tarjeta bimonetaria”. |

Issue origen: **Linear KRI-11**.