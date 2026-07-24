# Spec 05 — Transacciones (ingresos y gastos)

| Campo | Valor |
|-------|-------|
| ID | SPEC-05 |
| Estado | Draft |
| Prioridad | P0 |
| Dependencias | SPEC-01 (timezone), SPEC-03, SPEC-04; listado cruzado SPEC-14; canje SPEC-16 |

## 1. Contexto

Ingresos y gastos son el núcleo del ledger. Las transferencias se especifican en SPEC-06. El canje de moneda (`fx_debit` / `fx_credit`) en SPEC-16 forma parte del mismo ledger y aparece en el listado según las reglas de filtro de tipo.

La página `/transactions` (Movimientos) es el listado principal del ledger del workspace activo: **no** es un cashflow (incluye transfers y, con `type=all`, también `fx_*`).

## 2. Historias de usuario

1. Quiero registrar un gasto en una cuenta con categoría, monto y fecha.
2. Quiero registrar un ingreso.
3. Quiero editar o eliminar un movimiento reciente.
4. Quiero filtrar movimientos por periodo (este mes / esta semana / todo / rango), tipo, cuenta y categoría.
5. Quiero paginar el listado hacia adelante sin perder el contexto de filtros (estado en URL).
6. Quiero limpiar filtros y volver al default “Este mes”.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Create income / expense |
| FR-02 | Update description, category, amount, date, account (con recálculo de saldos) |
| FR-03 | Delete (hard en MVP si no hay split; si hay split, ver SPEC-10) |
| FR-04 | List con filtros AND, periodo resuelto por timezone, y paginación cursor (ver §4.2–4.5) |
| FR-05 | amount > 0; currency = account.currency |

## 4. Reglas de negocio

### 4.1 Creación / edición / borrado

- `occurredOn` no puede ser > hoy + 1 día (timezone del user) — tolerancia clock skew.
- Categoría requerida y compatible con type.
- Account activa. Por defecto del mismo workspace; si la cuenta es de otro workspace del usuario, ver [SPEC-14](./14-cross-workspace-money.md) (expense/income funded externo).
- Transferencias siguen exigiendo cuentas del mismo workspace ([SPEC-06](./06-transfers.md)).
- Member puede crear; viewer no.
- Editar amount/account recalcula balances derivados (no hay campo balance mutable).

### 4.2 Listado — alcance del ledger (FR-04)

- El listado es del **ledger completo** del workspace (más txs que afectan cuentas locales con registro en otro workspace, SPEC-14 FR-05).
- **No** es cashflow del dashboard: en el periodo pueden aparecer `income`, `expense`, `transfer` y (según filtro de tipo) `fx_debit` / `fx_credit`.
- Orden: `occurredOn` desc, luego `createdAt` desc, luego `id` desc (desempate estable para cursor).

### 4.3 Periodo (mutuamente excluyente)

Modos de `period` (query URL y contrato de dominio):

| Modo | Valor `period` | Default | Rango sobre `occurredOn` |
|------|----------------|---------|--------------------------|
| Este mes | `this_month` | **Sí** — ausente o inválido ≡ `this_month` | Mes calendario en `User.timezone` |
| Esta semana | `this_week` | No | Lunes–domingo calendario en `User.timezone` |
| Todo | `all` | No | Sin filtro de fecha |
| Custom | `custom` | No | `from`…`to` inclusive (ISO `YYYY-MM-DD`) |

**Paridad con dashboard:** “Este mes” usa la **misma definición de mes calendario en timezone del usuario** que [SPEC-12](./12-dashboard.md) FR-04 / `getCurrentMonthPeriod` (proyección a fechas contables `@db.Date`). El listado expone el rango como fechas **inclusivas** `from`/`to` (día 1 … último día del mes); el dashboard cashflow puede usar semiabierto `[start, endExclusive)` internamente — ambos cubren el mismo conjunto de `occurredOn`.

**“Esta semana” (MVP):**

- Semana calendario **lunes–domingo** en `User.timezone`.
- **No** es rolling 7 días hacia atrás.
- **No** usa el ancla semanal de presupuestos ([SPEC-07](./07-budgets.md) / `getWeeklyBounds` por `startDate` del budget).

**Custom:**

- Requiere `from` y `to` presentes, formato ISO `YYYY-MM-DD`, fechas de calendario válidas.
- `from ≤ to` (inclusive); `from = to` permitido (un solo día).
- Span inclusivo ≤ **366** días: `(días calendario entre from y to) + 1 ≤ 366`.
- Si falla alguna regla → error de dominio `InvalidDateRange` (no aplicar un rango parcial silencioso).

**Normalización / precedencia URL (conceptual):**

1. Resolver `period`: ausente o valor desconocido → `this_month`.
2. Si `period ∈ { this_month, this_week, all }` → **ignorar** `from`/`to` de la URL al resolver el rango (pueden omitirse al reescribir URL).
3. Si `period = custom` → exigir y validar `from`/`to`; no mezclar con resolución de mes/semana.
4. “Limpiar filtros” (UI) → estado equivalente a solo default: `period=this_month` (o ausente), sin `type`/`accountId`/`categoryId`/`cursor`/`from`/`to`. **No** vuelve a `all`.

Timezone: `User.timezone` ([SPEC-01](./01-auth.md)). Preferencias no reescriben `occurredOn` históricos; solo afectan qué ventana es “actual”.

### 4.4 Filtros AND (además del periodo)

| Filtro | Valores | Semántica |
|--------|---------|-----------|
| `type` | `all` (default / ausente) \| `income` \| `expense` \| `transfer` | Ver matriz abajo |
| `accountId` | id opcional | Match si `accountId` **o** `counterpartyAccountId` (cubre origen/destino de transfer y patas de fx) |
| `categoryId` | id opcional | Match exacto `categoryId`. Transfers y `fx_*` tienen `categoryId = null` → **quedan fuera** cuando hay filtro de categoría |

**Matriz `type` (MVP):**

| `type` URL | Tipos de ledger incluidos |
|------------|---------------------------|
| `all` / ausente / inválido → `all` | `income`, `expense`, `transfer`, `fx_debit`, `fx_credit` |
| `income` | solo `income` |
| `expense` | solo `expense` |
| `transfer` | solo `transfer` (**no** incluye `fx_*`) |

- En MVP, `fx_*` **solo** son visibles con `type=all`.
- Filtros se combinan con **AND** (periodo ∩ tipo ∩ cuenta ∩ categoría).
- `accountId` / `categoryId` inexistentes o fuera del workspace: el service/authz responde vacío o error de membresía según capa de I/O; el dominio de filtros no inventa ids.

### 4.5 Paginación cursor (FR-04)

- Cursor **forward-only** sobre el orden de §4.2.
- **Page size fijo MVP:** `25` (`LIST_PAGE_SIZE`).
- Estado en URL: `cursor` = id de la última tx de la página anterior (mismo contrato que el listado actual).
- Al **cambiar cualquier filtro** (`period`, `from`/`to`, `type`, `accountId`, `categoryId`) → **reset** de `cursor` (omitir de la URL / no enviar).
- **Cursor inválido** (id inexistente, de otro workspace, o inconsistente con el orden): tratar como **primera página** (ignorar cursor; no error hard al usuario). Evita callejones sin salida si se borró la tx ancla.

## 5. Comandos y consultas

| Tipo | Nombre | Input destacado |
|------|--------|-----------------|
| Command | `CreateIncome` | accountId, categoryId, amountCents, occurredOn, description? |
| Command | `CreateExpense` | igual |
| Command | `UpdateTransaction` | campos mutables |
| Command | `DeleteTransaction` | transactionId |
| Query | `ListTransactions` | ver contrato abajo |
| Query | `GetTransaction` | id |

### 5.1 Contrato `ListTransactions` (query / URL)

Parámetros de consulta (estado en URL de `/transactions`):

| Param | Tipo | Default conceptual |
|-------|------|--------------------|
| `period` | `this_month` \| `this_week` \| `all` \| `custom` | `this_month` |
| `from` | `YYYY-MM-DD` | solo con `custom` |
| `to` | `YYYY-MM-DD` | solo con `custom` |
| `type` | `all` \| `income` \| `expense` \| `transfer` | `all` |
| `accountId` | Id? | — |
| `categoryId` | Id? | — |
| `cursor` | Id? | primera página |
| *(impl)* `limit` | — | fijo 25 en UI listado; no exponer selector en MVP |

Resolución de dominio (puro) antes del service:

1. `resolveListPeriod({ period, from, to, now, timezone })` → `{ kind: 'unbounded' }` \| `{ kind: 'bounded', from, to }` (ISO inclusive) o lanza `InvalidDateRange`.
2. `resolveListTypeFilter(type)` → `undefined` (sin predicado = todos los tipos) \| lista/enum de tipos Prisma a filtrar.
3. Service aplica AND + cursor + `limit = 25`, membership/authz, y alcance SPEC-14.

Helpers de periodo (puro; paridad dashboard):

- `getCurrentMonthPeriod(now, timezone)` — ya en dashboard; reutilizar o extraer a módulo compartido.
- `getCurrentWeekPeriod(now, timezone)` — lunes 00:00 … domingo inclusive (o equivalente half-open `[monday, nextMonday)` proyectado a `@db.Date`).

## 6. Criterios de aceptación

- [ ] Expense reduce saldo de cuenta asset; income lo aumenta.
- [ ] Validaciones de categoría/cuenta fallan con errores de dominio claros.
- [ ] List ordenado por `occurredOn` desc, luego `createdAt` desc (y `id` desc).
- [ ] Default de listado: periodo **este mes** (timezone usuario), `type=all`, sin cuenta/categoría, primera página (25 ítems).
- [ ] `this_week` = lunes–domingo en timezone; distinto del ancla weekly de presupuestos.
- [ ] `custom` valida `from≤to`, inclusive, span ≤366; `from=to` OK; error `InvalidDateRange` si no.
- [ ] Filtros AND; `type=transfer` no muestra `fx_*`; `type=all` sí puede mostrarlos.
- [ ] `accountId` incluye transfers donde la cuenta es origen o destino.
- [ ] `categoryId` excluye transfers/`fx_*` (sin categoría).
- [ ] Cambiar filtros limpia `cursor`; limpiar filtros vuelve a este mes (no a `all`).
- [ ] Cursor inválido → primera página (sin error de producto).

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

### T-08 Periodo default / este mes (dominio)

- **Given** `now` = 2026-08-01T02:00:00Z, timezone `America/Argentina/Buenos_Aires` (wall = 2026-07-31 23:00)  
- **When** `resolveListPeriod({ period: undefined, … })` o `period: "this_month"`  
- **Then** rango bounded `from=2026-07-01`, `to=2026-07-31` (mismo mes que SPEC-12 / `getCurrentMonthPeriod`)

### T-09 Esta semana lunes–domingo

- **Given** `now` con wall local miércoles 2026-07-15 en `America/Argentina/Buenos_Aires`  
- **When** `resolveListPeriod({ period: "this_week", … })`  
- **Then** `from=2026-07-13` (lunes), `to=2026-07-19` (domingo)

### T-10 Periodo `all`

- **When** `resolveListPeriod({ period: "all", … })`  
- **Then** `{ kind: "unbounded" }` (sin from/to)

### T-11 Custom válido

- **Given** `from=2026-01-01`, `to=2026-01-01`  
- **When** `period=custom`  
- **Then** bounded ese día

### T-12 Custom `from > to`

- **When** `custom` con `from=2026-02-01`, `to=2026-01-01`  
- **Then** error `InvalidDateRange`

### T-13 Custom span > 366 días

- **Given** `from=2025-01-01`, `to=2026-01-02` (span inclusivo 367)  
- **When** `period=custom`  
- **Then** error `InvalidDateRange`

### T-14 Custom incompleto

- **When** `period=custom` sin `to` (o sin `from`)  
- **Then** error `InvalidDateRange`

### T-15 Ignorar from/to si no es custom

- **Given** `period=this_month`, `from`/`to` presentes en input URL  
- **When** resolve  
- **Then** rango = mes actual; from/to de URL no alteran el resultado

### T-16 Type filter vs fx

- **Given** txs `income`, `transfer`, `fx_debit` en rango  
- **When** `type=all` → las tres pueden listarse; `type=transfer` → solo `transfer`; `type=income` → solo `income`

### T-17 accountId en transfer

- **Given** transfer A→B  
- **When** filtro `accountId=B`  
- **Then** la transfer aparece

### T-18 categoryId excluye transfer

- **Given** expense con cat X y transfer sin categoría  
- **When** filtro `categoryId=X`  
- **Then** solo el expense

### T-19 Normalización type/period inválidos

- **When** `period="nope"` → tratar como `this_month`; `type="fx_debit"` u otro no permitido en URL → tratar como `all`

## 8. Fuera de alcance

- Adjuntos / OCR de tickets
- Recurrencia automática (fase P2)
- Canje de moneda (comandos) → [SPEC-16](./16-currency-exchange.md); en listado solo visibilidad vía `type=all`
- Búsqueda por texto libre
- Multi-select de cuentas/categorías/tipos
- Totales agregados del resultado filtrado (sumas income/expense en cabecera)
- Filtro por `createdByUserId`
- Paginación hacia atrás / page numbers / page size configurable
- Selector de timezone distinto del perfil (SPEC-01)

## 9. Notas

Preferir un modelo único `Transaction` con `type` discriminado; tests cubren cada variante.

- `amount.currency` = `account.currency` (invariante; multi-ledger OK).
- Tipos `fx_debit` / `fx_credit` (SPEC-16) **no** cuentan en budget spent ni cashflow; **sí** pueden aparecer en Movimientos con `type=all`.

Detalle de UI: [SPEC-13](./13-transaction-detail.md). Dinero entre workspaces: [SPEC-14](./14-cross-workspace-money.md).

### 9.1 Hand-off implementación (capas)

| Capa | Qué |
|------|-----|
| Domain | `getCurrentWeekPeriod`; `resolveListPeriod`; `resolveListTypeFilter`; errores `InvalidDateRange`; constante `LIST_PAGE_SIZE=25`; reutilizar/extraer `getCurrentMonthPeriod` sin acoplar UI |
| Services | `listTransactions`: aceptar periodo resuelto o params URL ya normalizados; `limit` default 25 en listado de página; cursor inválido → primera página; conservar OR de cuenta y alcance SPEC-14 |
| Schemas/actions | Zod de query params (`period`, `type` de listado ≠ enum completo de Prisma); no confiar solo en middleware |
| UI | Estado en searchParams; chips/selects; reset cursor al cambiar filtros; “Limpiar” → este mes |

**Tensión resuelta:** semana de Movimientos ≠ semana de Budget. Mes de Movimientos = mes de Dashboard (timezone usuario).
