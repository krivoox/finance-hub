# Spec 18 — Transacciones recurrentes (plantillas)

| Campo | Valor |
|-------|-------|
| ID | SPEC-18 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-01 (timezone), SPEC-03 (cuentas), SPEC-04 (categorías), SPEC-05 (transacciones), SPEC-06 (transferencias) |

## 1. Contexto

Muchos movimientos se repiten con cadencia previsible (sueldo, alquiler, servicios, suscripciones, transferencia mensual al ahorro, pago de tarjeta). Registrarlos manualmente todos los meses es fricción y fuente de olvidos o duplicados.

Finance Hub introduce **plantillas recurrentes**: una `RecurringRule` describe *qué* movimiento se repite y *cada cuánto*, pero **no** es una transacción — solo se convierten en `Transaction` reales cuando el usuario **confirma** la ocurrencia (semi-auto).

**Nivel de automatización en v1 = 2 (semi-auto):**

- La app calcula on-demand las ocurrencias vencidas y próximas.
- El usuario ve una bandeja en `/transactions/recurring` y confirma con 1 tap.
- **No** hay cron, ni push, ni auto-materialización sin confirmación.
- Auto-materialize opt-in (por regla) → **fase 2**.

Además:

- Página `/transactions` (copy “Transacciones”; antes “Movimientos” en UI). La ruta no cambia.
- Submenú anidado `/transactions/recurring` con ícono `Repeat`; copy de producto = “Recurrente”.
- CTA sidebar “Registrar” sigue creando movimientos manuales; el flujo de recurrentes vive en su submenú.
- Toda `Transaction` generada por una regla muestra en el listado un indicador (🔄 / `Repeat`) con tooltip “Generada por: {rule.name}”.

## 2. Historias de usuario

1. Como usuario quiero declarar que mi alquiler se paga el día 5 de cada mes por 350.000 desde mi checking, para que la app me recuerde confirmarlo cada mes.
2. Quiero registrar mi sueldo mensual como ingreso recurrente sin tener que cargarlo cada 30 días.
3. Quiero automatizar la transferencia semanal de mi checking a mi cuenta de ahorro sin cablearla en el banco.
4. Al abrir la app quiero ver una bandeja con lo vencido y lo próximo, y confirmar con 1 tap.
5. Quiero editar una plantilla (subir el monto del alquiler) sin tocar las transacciones ya generadas.
6. Quiero pausar una plantilla cuando cancelo una suscripción sin perder el historial.
7. Al confirmar quiero que la app me avise si detecta que ya cargué manualmente un gasto parecido esta semana.
8. Cuando archivo una cuenta que una plantilla usaba, no quiero errores silenciosos: la plantilla se pausa sola.
9. Quiero ver en el dashboard un vistazo de lo que se viene los próximos días.
10. Si elimino una plantilla, las transacciones que ya generó deben seguir en mi historial con el mismo indicador.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Crear plantilla recurrente de tipo `expense`, `income` o `transfer` con cadencia `weekly`, `biweekly`, `monthly` o `yearly` |
| FR-02 | Editar plantilla: cambios afectan **solo** ocurrencias futuras aún no materializadas |
| FR-03 | Pausar / reanudar plantilla (`active` ↔ `paused`) |
| FR-04 | Eliminar plantilla = transición a `ended` (soft-delete): no aparece en bandeja pero conserva vínculo con transacciones ya generadas |
| FR-05 | Listar plantillas del workspace (filtros por status y por tipo) |
| FR-06 | Calcular on-demand ocurrencias en una ventana `[from, to]` (bandeja + preview dashboard) — sin cron, sin job |
| FR-07 | Materializar una ocurrencia = crear una `Transaction` real ligada a la plantilla (`recurringRuleId`, `scheduledOn`), con idempotencia por par (`ruleId`, `scheduledOn`) |
| FR-08 | Al materializar, ejecutar heurística de duplicados y devolver posibles matches (no bloquea) |
| FR-09 | Auto-pausar plantillas cuyas cuentas fueron archivadas |
| FR-10 | Preview de próximas ocurrencias en el dashboard (widget) |
| FR-11 | DTO de listado de transacciones (SPEC-05) incluye metadata de recurrencia cuando aplica |

## 4. Reglas de negocio

### 4.1 Entidad `RecurringRule`

Plantilla configurable por el usuario. **No** es una `Transaction`; no afecta saldos ni budgets por sí sola.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| workspaceId | Id | tenancy |
| name | string | requerido, único-friendly por workspace (no unicidad forzada; UX puede sugerir) |
| type | `expense` \| `income` \| `transfer` | subconjunto de `TransactionType` — sin `fx_*` en v1 |
| amountCents | number | > 0 |
| currency | CurrencyCode | debe coincidir con `account.currency` (y con `counterpartyAccount.currency` en transfer) |
| accountId | Id | cuenta principal. En transfer = origen |
| counterpartyAccountId | Id? | solo para transfer; distinta de `accountId`; mismo workspace; misma currency |
| categoryId | Id? | requerido para `income`/`expense`; **null** en `transfer` |
| description | string? | espejo opcional para la tx generada |
| frequency | `weekly` \| `biweekly` \| `monthly` \| `yearly` | v1; sin `daily` ni custom |
| startDate | Date (`@db.Date`) | fecha de la **primera** ocurrencia proyectada (ancla) |
| endDate | Date? | inclusiva; si presente, no se proyectan ocurrencias con `scheduledOn > endDate` |
| status | `active` \| `paused` \| `ended` | ver §4.4 |
| pausedReason | `manual` \| `account_archived` \| null | trazabilidad; solo válido si `status = 'paused'` |
| createdByUserId | Id | member+ |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| endedAt | DateTime? | set al pasar a `ended` |

**Invariantes:**

- `type = 'transfer'` ⇔ `counterpartyAccountId != null` **y** `categoryId = null`.
- `type ∈ { 'income', 'expense' }` ⇔ `counterpartyAccountId = null` **y** `categoryId != null`.
- `category.kind` compatible con `type` (mismo criterio que SPEC-05 T-04).
- `accountId ≠ counterpartyAccountId`.
- Ambas cuentas del **mismo workspace**, misma `currency`, no archivadas al crear.
- `amountCents > 0`.
- `startDate` es una fecha de calendario válida en `User.timezone`; puede ser pasada, presente o futura.
- Si `endDate` presente: `endDate ≥ startDate`.
- `status = 'ended'` es terminal salvo migración explícita (v1 no permite reactivar `ended`; usuario debe crear una nueva).

### 4.2 Cadencia y proyección de ocurrencias (pura)

Una **ocurrencia proyectada** es un valor efímero `{ ruleId, scheduledOn }`, **no** persistido hasta materializar. Se calcula con función pura sobre `RecurringRule` + ventana.

Regla base:

- `startDate` es la primera ocurrencia (`n = 0`).
- La `n`-ésima ocurrencia se deriva por `frequency` (ver §4.2.1).
- No se proyectan ocurrencias con `scheduledOn > endDate` (si presente).
- No se proyectan ocurrencias si `status ≠ 'active'`.

#### 4.2.1 Regla por frecuencia

| frequency | `scheduledOn(n)` (n = 0, 1, 2, …) |
|-----------|------------------------------------|
| `weekly` | `startDate + 7·n` días |
| `biweekly` | `startDate + 14·n` días |
| `monthly` | mes calendario avanzado `n` veces desde `startDate`, mismo día del mes ajustado a fin de mes (§4.2.2) |
| `yearly` | año calendario avanzado `n` veces desde `startDate`, mismo mes/día, ajustado si 29-feb en año no bisiesto (§4.2.2) |

- Toda aritmética sobre `@db.Date` en `User.timezone`: sin hora, sin DST — se compara por fecha calendario.
- El “día de la semana” en `weekly/biweekly` queda derivado de `startDate` (no hay campo separado `anchorWeekday`).

#### 4.2.2 Ajuste de fin de mes / 29-feb (regla “clamp al último día”)

- Si el día ancla no existe en el mes objetivo, `scheduledOn` se ajusta al **último día del mes existente**.
  - Ej. `startDate = 2026-01-31`, monthly:
    - n=0 → 2026-01-31
    - n=1 → 2026-02-28 (o 29 si bisiesto)
    - n=2 → 2026-03-31
    - n=3 → 2026-04-30
- Yearly: `startDate = 2024-02-29` (bisiesto):
  - n=1 → 2025-02-28
  - n=2 → 2026-02-28
  - n=4 → 2028-02-29
- **No** hay “memoria” del día original: cada ocurrencia se re-clampa desde `startDate` (implementación pura, sin drift acumulado).

#### 4.2.3 Consulta `computeOccurrences(rule, from, to, now)`

- **Contrato:** devuelve la lista de `scheduledOn` en `[from, to]` (inclusivo), en orden ascendente.
- No mira materializaciones ni transacciones — es puro sobre la regla y la ventana.
- **Costo:** O(k) donde `k` = número de ocurrencias en la ventana. `from`/`to` acotan; el service debe validar rango finito.

### 4.3 Estados derivados de la ocurrencia

Dada una ocurrencia proyectada `{ ruleId, scheduledOn }` y el conjunto de materializaciones existentes:

| Estado | Condición |
|--------|-----------|
| `materialized` | existe `Transaction` con `(recurringRuleId, scheduledOn) = (ruleId, scheduledOn)` |
| `pending_past` | no materializada, `scheduledOn < today` (timezone user) |
| `pending_today` | no materializada, `scheduledOn = today` |
| `pending_upcoming` | no materializada, `today < scheduledOn ≤ today + PREVIEW_HORIZON_DAYS` |
| `pending_future` | no materializada, `scheduledOn > today + PREVIEW_HORIZON_DAYS` |

- `PREVIEW_HORIZON_DAYS` = **30** (constante de dominio, revisable en fase 2).
- La bandeja de `/transactions/recurring` muestra `pending_past` + `pending_today` + `pending_upcoming`.
- El widget de dashboard (SPEC-12) muestra `pending_today` + `pending_upcoming`.
- `pending_future` no se listan (se ven al abrir el detalle de la regla o su calendario en fase 2).

### 4.4 Ciclo de vida y transiciones

```text
              create
                │
                ▼
           ┌─────────┐  pause         ┌────────┐
           │ active  │───────────────▶│ paused │
           │         │◀───────────────│        │
           └─────────┘   resume       └────────┘
                │                          │
                │  endDate alcanzada       │  delete
                │  o delete                │
                ▼                          ▼
                       ┌────────┐
                       │ ended  │  (terminal)
                       └────────┘
```

Reglas:

- `pause` manual → `pausedReason = 'manual'`.
- `pause` automática por cuenta archivada → `pausedReason = 'account_archived'` (§4.7).
- `resume` solo desde `paused`. Si `endDate` ya pasó, `resume` es rechazado (`RecurringRuleEnded`).
- `end` (soft-delete) es terminal. La regla desaparece de la lista activa pero:
  - conserva `id` y `name`;
  - las `Transaction` ya materializadas mantienen su FK a la regla `ended`;
  - el tooltip “Generada por: {rule.name}” sigue funcionando.
- **No hay hard-delete de RecurringRule en v1** (ADR-004 “archive over delete”).

### 4.5 Editar plantilla (FR-02)

Semántica: “edición = cambio de plantilla desde hoy en adelante”. Nunca reescribe transacciones históricas.

| Cambio | Efecto |
|--------|--------|
| `name`, `description` | cosmético; próximas materializaciones usan el nuevo valor; tooltip de tx históricas muestra el `name` **actual** |
| `amountCents`, `categoryId`, `accountId`, `counterpartyAccountId` | aplica solo a **ocurrencias futuras no materializadas**; las ya materializadas no se tocan |
| `frequency`, `startDate`, `endDate` | replanifica el conjunto proyectado; las ya materializadas quedan como estaban con su `scheduledOn` original (pueden quedar “huérfanas” de la nueva cadencia, pero se conservan) |
| `type` | **no** editable en v1 (crear nueva regla) |
| `currency` | **no** editable (deriva de la cuenta; si cambia de cuenta, la nueva debe tener la misma currency) |
| `status` | vía comandos dedicados (`pause`/`resume`/`end`), no vía update genérico |

**Invariantes de edición:**

- Cuenta destino debe estar activa al momento de editar (no archivada).
- Todas las invariantes de creación (§4.1) revalidadas.
- Editar `startDate` hacia el pasado **no** genera automáticamente materializaciones retro: solo se reproyectan a futuro; las vencidas aparecen en bandeja para confirmar 1×1.

### 4.6 Materialización — `MaterializeRecurringOccurrence`

Convierte una ocurrencia proyectada en una `Transaction` real.

**Input:** `{ recurringRuleId, scheduledOn, overrides? }`

`overrides` (opcional, para “editar antes de confirmar”):

- `occurredOn` (fecha contable — default = `scheduledOn`, ver §4.6.1)
- `amountCents`
- `description`
- `categoryId` (solo income/expense)

**Pipeline (dominio puro donde aplica):**

1. Cargar regla; validar `status = 'active'` o `paused` con `pausedReason = 'manual'` — permitir materializar vencidas de una regla pausada manualmente (el usuario está poniéndose al día). Rechazar si `ended` (`RecurringRuleEnded`).
2. Validar que `scheduledOn` corresponde a una ocurrencia real de la regla (usar `computeOccurrences(rule, scheduledOn, scheduledOn, now)` — la lista debe contener ese día). Si no → `NotAScheduledOccurrence`.
3. Validar cuentas activas al momento de materializar (no archivadas). Si `expense/income` sobre cuenta archivada → `AccountArchived`. Si transfer con cuenta archivada → `AccountArchived`.
4. Validar idempotencia: no debe existir `Transaction` con `(recurringRuleId, scheduledOn)`. Si existe → `AlreadyMaterialized` (ver §4.6.2).
5. Aplicar `overrides` sobre la plantilla → payload de tx.
6. Resolver `occurredOn` (§4.6.1).
7. Ejecutar heurística de duplicados (§4.8) → devolver `warnings.possibleDuplicates: Transaction[]` (metadata, no bloqueante).
8. Crear la `Transaction` según su `type`, delegando a las reglas de SPEC-05 (income/expense) o SPEC-06 (transfer) — se aplican **todas** sus invariantes (categoría compatible, currencies iguales en transfer, etc.).
9. La tx creada guarda `recurringRuleId = rule.id`, `scheduledOn = scheduledOn`.

**Postcondición:** balances de cuentas actualizados igual que si el usuario hubiera creado la tx a mano (misma clase de efecto).

#### 4.6.1 Resolución de `occurredOn`

- Si `overrides.occurredOn` presente → usar (respetando SPEC-05 §4.1: `occurredOn ≤ today + 1`).
- Si `scheduledOn ≤ today` → `occurredOn = scheduledOn` (contable en fecha planificada, aunque sea pasado).
- Si `scheduledOn = today + 1` → `occurredOn = scheduledOn` (dentro de la tolerancia clock-skew).
- Si `scheduledOn > today + 1` → error `TooEarlyToMaterialize`. En v1 no se puede adelantar; el usuario debe esperar o crear una tx manual.

#### 4.6.2 Idempotencia

- Índice único a nivel infra: `UNIQUE (recurringRuleId, scheduledOn) WHERE recurringRuleId IS NOT NULL`.
- El dominio expone la invariante como `assertNotAlreadyMaterialized(rule, scheduledOn, existingScheduledSet)` — pura, testeable.
- Doble tap idempotente: segunda llamada con mismos `(ruleId, scheduledOn)` → error `AlreadyMaterialized` con referencia a la tx ya creada (útil para reintentos de UI; UX puede tratarlo como éxito silencioso).

### 4.7 Auto-pausa por cuenta archivada (FR-09)

- Al ejecutar `ArchiveAccount(accountId)` (SPEC-03), *antes* de completar el archivado, buscar todas las `RecurringRule` con `status = 'active'` donde `accountId = X` o `counterpartyAccountId = X`.
- Para cada una: `status → 'paused'`, `pausedReason → 'account_archived'`.
- Al **desarchivar** la cuenta: **no** se reactivan automáticamente. El usuario debe volver a `active` desde la UI (permite auditar antes de retomar débitos automáticos).
- Dominio expone `shouldAutoPauseOnAccountArchive(rule, accountId) → boolean` y `applyAutoPause(rule, reason) → RecurringRule` — puras.

### 4.8 Heurística de detección de duplicados (FR-08)

Función pura: `findPossibleDuplicates(rule, scheduledOn, recentTransactions) → Transaction[]`.

**Definición de “similar”** — todas AND:

- Misma `workspaceId` (implícito por la carga de `recentTransactions`).
- Misma `type` que la regla.
- Misma `accountId` que la regla (y misma `counterpartyAccountId` si transfer).
- `amountCents` en rango `[rule.amountCents · 0.9, rule.amountCents · 1.1]` (±10%; entero, redondeo estándar).
- `occurredOn ∈ [scheduledOn − 3 días, scheduledOn + 3 días]`.
- **NO** ligada aún a una regla (`recurringRuleId IS NULL`) — no duplicamos con otras materializaciones.
- (Para income/expense) misma `categoryId` que la regla.

**Comportamiento:**

- La materialización sigue adelante; el resultado incluye la lista de posibles duplicados.
- UI decide si mostrar diálogo confirm (“Ya cargaste ‘Netflix’ el 03/08 por 4990. ¿Confirmar de todos modos?”). Nunca bloquea desde el dominio.
- Ventana de búsqueda del service: cargar txs del workspace con `occurredOn ∈ [scheduledOn − 3, scheduledOn + 3]` — costo acotado.

### 4.9 Ámbito de la regla y tenancy

- Toda regla pertenece a un `Workspace` (personal o grupal).
- Roles (SPEC-02): `owner` / `admin` / `member` pueden crear, editar, pausar, reanudar, eliminar y materializar reglas. `viewer` solo lee.
- Sin cross-workspace en v1: reglas y cuentas participantes viven en el mismo workspace. Aportes cross-workspace (SPEC-14) **no** son recurrentes en v1.
- Sin FX en v1: cuentas participantes tienen la misma `currency`. Canje (SPEC-16) fuera de alcance.

### 4.10 Efectos sobre otras entidades

| Entidad | Efecto |
|---------|--------|
| `Account.balance` (derivado) | igual que una tx manual: se recalcula al materializar / editar / borrar la tx materializada |
| `Budget.spent` (SPEC-07) | igual que una tx manual: expense recurrente cuenta si categoría matchea el budget en el periodo |
| `Goal.currentAmount` (SPEC-08) | una transfer recurrente **NO** dispara `GoalContribution` en v1 aun si `counterpartyAccountId = goal.linkedAccountId` (goals recurrentes = fase 2 explícita) |
| `Split` (SPEC-10) | v1 no permite crear splits desde materialización recurrente (fuera de alcance) |
| Transactions listado (SPEC-05 FR-04) | DTO incluye `recurring: null \| { ruleId, ruleName, scheduledOn, isDrifted }` — join análogo al patrón `goalContribution`. `isDrifted = true` si `occurredOn ≠ scheduledOn`. No introduce un nuevo `type`. |
| Editar/borrar la tx materializada | permitido con SPEC-05 estándar. **NO** re-abre la ocurrencia: la idempotencia `(ruleId, scheduledOn)` sigue “usada”. Si el usuario borró la tx y quiere regenerarla, en v1 debe crear una tx manual — la ocurrencia no vuelve a la bandeja (evita loops de confirmar/borrar). Anotado en riesgos. |

## 5. Comandos y consultas

### 5.1 Commands

| Comando | Input destacado | Notas |
|---------|-----------------|-------|
| `CreateRecurringRule` | name, type, amountCents, currency, accountId, counterpartyAccountId?, categoryId?, description?, frequency, startDate, endDate? | validar invariantes §4.1 |
| `UpdateRecurringRule` | id + campos editables (§4.5) | rechaza cambio de `type` y `currency` |
| `PauseRecurringRule` | id | `active → paused` con `pausedReason='manual'` |
| `ResumeRecurringRule` | id | `paused → active`; requiere cuentas no archivadas |
| `EndRecurringRule` | id | soft-delete → `ended` (terminal) |
| `MaterializeRecurringOccurrence` | ruleId, scheduledOn, overrides? | ver §4.6 |

### 5.2 Queries

| Consulta | Output |
|----------|--------|
| `ListRecurringRules(workspaceId, { status?, type? })` | lista de reglas + agregados livianos (próxima ocurrencia, última materialización) |
| `GetRecurringRule(id)` | detalle |
| `ListPendingOccurrences(workspaceId, { horizonDays? })` | ocurrencias `pending_past` + `pending_today` + `pending_upcoming` sobre reglas `active` (y `paused` con `pausedReason='manual'` para vencidas) |
| `PreviewUpcomingForDashboard(workspaceId, { horizonDays = 30 })` | ocurrencias `pending_today` + `pending_upcoming` para el widget de SPEC-12 |

### 5.3 Contratos de dominio (puros — hand-off)

```ts
// src/features/recurring/domain/cadence.ts
export function computeOccurrences(
  rule: RecurringRule,
  windowFrom: DateOnly,
  windowTo: DateOnly,
  now: DateOnly,      // hoy en User.timezone
): DateOnly[]

export function clampToEndOfMonth(year: number, month: number, day: number): DateOnly

// src/features/recurring/domain/status.ts
export type OccurrenceStatus =
  | 'materialized'
  | 'pending_past'
  | 'pending_today'
  | 'pending_upcoming'
  | 'pending_future'

export function classifyOccurrence(
  scheduledOn: DateOnly,
  today: DateOnly,
  horizonDays: number,        // PREVIEW_HORIZON_DAYS = 30
  materializedOn: Set<DateOnly>,
): OccurrenceStatus

// src/features/recurring/domain/materialize.ts
export function assertNotAlreadyMaterialized(
  ruleId: Id,
  scheduledOn: DateOnly,
  existing: Set<DateOnly>,    // scheduledOn ya materializados para esa rule
): void   // lanza AlreadyMaterialized

export function resolveOccurredOn(
  scheduledOn: DateOnly,
  today: DateOnly,
  override?: DateOnly,
): DateOnly  // lanza TooEarlyToMaterialize

// src/features/recurring/domain/duplicates.ts
export function findPossibleDuplicates(
  rule: RecurringRule,
  scheduledOn: DateOnly,
  recent: Transaction[],
): Transaction[]

// src/features/recurring/domain/lifecycle.ts
export function shouldAutoPauseOnAccountArchive(
  rule: RecurringRule,
  archivedAccountId: Id,
): boolean

export function canResume(rule: RecurringRule, today: DateOnly): true | RecurringRuleError
```

**Prohibido en `domain/`:** Prisma, Next, React, cookies, session. El service traduce a I/O y transacción DB.

## 6. Criterios de aceptación

- [ ] Crear una regla monthly ancla día 31 y comprobar que las ocurrencias de febrero se ajustan al 28/29 (§4.2.2).
- [ ] Crear regla weekly ancla martes → todas las ocurrencias son martes por 12 semanas.
- [ ] Ocurrencia con `scheduledOn = today − 5 días` (regla creada retroactivamente) aparece en bandeja como `pending_past`.
- [ ] Confirmar (1 tap) crea una `Transaction` con `occurredOn = scheduledOn`, con `recurringRuleId` y `scheduledOn` seteados.
- [ ] Doble tap sobre la misma ocurrencia falla con `AlreadyMaterialized`; no hay 2 transacciones.
- [ ] Materializar con `scheduledOn > today + 1` falla con `TooEarlyToMaterialize`.
- [ ] Editar la plantilla (subir monto) no cambia transacciones ya materializadas; la siguiente ocurrencia usa el nuevo monto.
- [ ] Eliminar (`end`) la plantilla: no aparece más en la lista de activas; las tx históricas siguen con tooltip “Generada por: {name}”.
- [ ] Archivar la cuenta origen de una regla activa: la regla pasa a `paused` con `pausedReason='account_archived'`; no se materializa nada; desarchivar la cuenta no reactiva sola.
- [ ] Al materializar, si hay una tx manual similar (mismo tipo, misma cuenta, monto ±10%, `occurredOn ∈ [sched−3, sched+3]`, misma categoría, no ligada a regla) → resultado incluye `warnings.possibleDuplicates ≠ []`.
- [ ] Widget dashboard muestra ocurrencias en ventana `[today, today + 30]` sobre reglas `active`.
- [ ] Listado `/transactions` (SPEC-05): transacciones generadas muestran indicador de recurrencia y tooltip con el `name` actual de la regla (incluso si la regla está `ended`).
- [ ] Viewer no puede crear ni materializar (autz falla en service).
- [ ] Timezone del usuario respetada: “vencida” se determina contra `today` en `User.timezone`.

## 7. Escenarios de test (TDD)

### T-01 Monthly ancla día 5

- **Given** rule monthly, `startDate = 2026-01-05`
- **When** `computeOccurrences(rule, 2026-01-01, 2026-04-30, now)`
- **Then** `[2026-01-05, 2026-02-05, 2026-03-05, 2026-04-05]`

### T-02 Monthly ancla día 31 con clamp

- **Given** rule monthly, `startDate = 2026-01-31`
- **When** `computeOccurrences(rule, 2026-01-01, 2026-05-31, now)`
- **Then** `[2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30, 2026-05-31]`

### T-03 Weekly hereda día de la semana

- **Given** rule weekly, `startDate = 2026-08-04` (martes)
- **When** `computeOccurrences(rule, 2026-08-01, 2026-09-01, now)`
- **Then** `[2026-08-04, 2026-08-11, 2026-08-18, 2026-08-25, 2026-09-01]` (todos martes)

### T-04 Biweekly

- **Given** rule biweekly, `startDate = 2026-01-02`
- **When** `computeOccurrences(rule, 2026-01-01, 2026-02-28, now)`
- **Then** `[2026-01-02, 2026-01-16, 2026-01-30, 2026-02-13, 2026-02-27]`

### T-05 Yearly 29-feb sin drift

- **Given** rule yearly, `startDate = 2024-02-29`
- **When** `computeOccurrences(rule, 2024-01-01, 2028-12-31, now)`
- **Then** `[2024-02-29, 2025-02-28, 2026-02-28, 2027-02-28, 2028-02-29]`

### T-06 endDate respetada

- **Given** rule monthly, `startDate = 2026-01-05`, `endDate = 2026-03-05`
- **When** compute hasta `2026-12-31`
- **Then** `[2026-01-05, 2026-02-05, 2026-03-05]` (no abril)

### T-07 status paused no proyecta

- **Given** rule con `status='paused'`
- **When** `computeOccurrences`
- **Then** `[]` (regla pausada no proyecta ocurrencias nuevas — la bandeja pinta vencidas previas por separado)

### T-08 Clasificación de ocurrencia — vencida

- **Given** `scheduledOn = 2026-08-01`, `today = 2026-08-05`, `horizon = 30`, sin materializar
- **When** `classifyOccurrence`
- **Then** `'pending_past'`

### T-09 Clasificación — hoy

- **Given** `scheduledOn = today`, no materializada
- **Then** `'pending_today'`

### T-10 Clasificación — próxima dentro del horizonte

- **Given** `scheduledOn = today + 10`, horizon 30, no materializada
- **Then** `'pending_upcoming'`

### T-11 Clasificación — futura fuera del horizonte

- **Given** `scheduledOn = today + 45`, horizon 30
- **Then** `'pending_future'`

### T-12 Clasificación — materializada

- **Given** `scheduledOn = today − 3`, presente en `materializedOn`
- **Then** `'materialized'`

### T-13 Idempotencia doble tap

- **Given** ocurrencia `(rule, 2026-08-05)` ya materializada
- **When** `MaterializeRecurringOccurrence(rule, 2026-08-05)` de nuevo
- **Then** error `AlreadyMaterialized`; el listado sigue con 1 sola tx

### T-14 Materializar vencida con `occurredOn = scheduledOn`

- **Given** `scheduledOn = 2026-08-01`, `today = 2026-08-05`
- **When** `resolveOccurredOn(scheduledOn, today)` sin override
- **Then** `2026-08-01` (respeta fecha contable pasada)

### T-15 Materializar demasiado adelantada

- **Given** `scheduledOn = today + 5`
- **When** `resolveOccurredOn(scheduledOn, today)`
- **Then** error `TooEarlyToMaterialize`

### T-16 Materializar dentro de tolerancia +1

- **Given** `scheduledOn = today + 1`
- **When** `resolveOccurredOn`
- **Then** `today + 1` (SPEC-05 permite `occurredOn ≤ today + 1`)

### T-17 Override de `occurredOn` válido

- **Given** `scheduledOn = 2026-08-01`, override `occurredOn = 2026-08-03`, `today = 2026-08-05`
- **When** `resolveOccurredOn`
- **Then** `2026-08-03`

### T-18 Override de `occurredOn` inválido (futuro > hoy+1)

- **Given** override `occurredOn = today + 5`
- **Then** error (delegado a SPEC-05: `OccurredOnInFuture`)

### T-19 NotAScheduledOccurrence

- **Given** rule monthly ancla 5, `today = 2026-08-06`
- **When** `MaterializeRecurringOccurrence(rule, 2026-08-07)` (día 7 no es ocurrencia)
- **Then** error `NotAScheduledOccurrence`

### T-20 Categoría kind mismatch en materialización

- **Given** rule type=expense con `categoryId` de kind income
- **When** create rule
- **Then** error `CategoryKindMismatch` (mismo error que SPEC-05 T-04)

### T-21 Transfer recurrente con misma cuenta

- **Given** `accountId = counterpartyAccountId`
- **When** create rule type=transfer
- **Then** error `SameAccountTransfer` (SPEC-06 T-02)

### T-22 Transfer recurrente cross-currency

- **Given** accountId ARS, counterpartyAccountId USD
- **Then** error `CurrencyMismatch` (SPEC-06 §4)

### T-23 Editar amount solo afecta futuras

- **Given** rule monthly, ancla 5, ya materializada la ocurrencia 2026-07-05 con amount=100000
- **When** update `amountCents = 120000`
- **Then** la tx del 05/07 sigue con 100000; la próxima materialización (05/08) usa 120000

### T-24 Editar startDate reproyecta

- **Given** rule weekly ancla martes; ya materializada la del 04/08 (martes)
- **When** update `startDate` a jueves 06/08
- **Then** próximas ocurrencias son jueves 06/08, 13/08, 20/08 …; la tx del 04/08 se conserva

### T-25 End rule = soft-delete

- **Given** rule con 3 tx ya materializadas
- **When** `EndRecurringRule(id)`
- **Then** `status='ended'`, `endedAt` seteado; `ListRecurringRules({ status:'active' })` no la incluye; las 3 tx conservan `recurringRuleId` y tooltip resuelve `name`

### T-26 Auto-pausa por account archived

- **Given** rule active con `accountId = X`
- **When** `ArchiveAccount(X)`
- **Then** rule pasa a `paused` con `pausedReason='account_archived'`; no genera ocurrencias nuevas

### T-27 Desarchivar cuenta no reactiva

- **Given** rule paused por account archived; cuenta desarchivada
- **When** consultar reglas
- **Then** rule sigue `paused`; usuario debe llamar `ResumeRecurringRule` explícito

### T-28 Resume con cuenta archivada falla

- **Given** rule paused; cuenta origen archivada
- **When** `ResumeRecurringRule`
- **Then** error `AccountArchived`

### T-29 Materializar en rule paused-manual permitido

- **Given** rule paused con `pausedReason='manual'`, ocurrencia vencida existente
- **When** materializar esa ocurrencia
- **Then** OK — el usuario “se pone al día” aunque haya pausado la generación futura

### T-30 Materializar en rule ended falla

- **Given** rule ended
- **When** materializar
- **Then** error `RecurringRuleEnded`

### T-31 Duplicado positivo por monto ±10% y ventana ±3 días

- **Given** rule expense Netflix 4990 el 05/08; tx manual el 03/08 por 4890, misma cuenta, misma categoría, sin `recurringRuleId`
- **When** `findPossibleDuplicates(rule, 2026-08-05, recent)`
- **Then** la tx del 03/08 aparece en el resultado

### T-32 Duplicado negativo por otra categoría

- **Given** mismo caso pero la tx manual tiene otra `categoryId`
- **Then** no aparece como duplicado

### T-33 Duplicado ignora tx ya ligadas a regla

- **Given** tx del 03/08 con `recurringRuleId ≠ null`
- **Then** no cuenta como duplicado (solo tx manuales huérfanas)

### T-34 Viewer no puede materializar

- **Given** viewer del workspace
- **When** materializar
- **Then** error `Forbidden` (delegado a authz de service)

### T-35 Bandeja recorta al horizonte

- **Given** rule monthly con ocurrencias en `today+5`, `today+35`, `today+65`
- **When** `ListPendingOccurrences({ horizonDays: 30 })`
- **Then** incluye `today+5`; no incluye `today+35` ni `today+65`

### T-36 DTO de listado incluye recurring metadata

- **Given** tx materializada por rule “Alquiler”
- **When** query listado
- **Then** DTO trae `recurring: { ruleId, ruleName: 'Alquiler', scheduledOn, isDrifted: false }`

### T-37 isDrifted true cuando occurredOn ≠ scheduledOn

- **Given** materialización con override `occurredOn = scheduledOn + 2`
- **Then** DTO trae `isDrifted: true`

### T-38 Borrar tx materializada no re-abre la ocurrencia

- **Given** tx `(rule, 2026-08-05)` materializada y luego borrada por el usuario
- **When** consultar `ListPendingOccurrences`
- **Then** la ocurrencia (rule, 2026-08-05) **no** vuelve a aparecer (idempotencia por par sigue consumida); documentado en Riesgos §8

## 8. Fuera de alcance (v1)

- Auto-materialización (opt-in por regla, con notificación) → **fase 2**.
- Push / email / recordatorios programados; en v1 no hay cron ni job. Cálculo on-demand al abrir app.
- Frecuencia `daily`.
- Cadencia custom (`every N days`, `byDay=['MO','WE']`, `bySetPos`, etc.).
- Ocurrencias saltadas explícitamente (`SkipOccurrence`): en v1, para “no pagar este mes” el usuario pausa la regla o simplemente ignora la ocurrencia en la bandeja (queda como `pending_past`).
- Regenerar ocurrencia después de borrar la tx materializada (loop de undo/redo).
- Goals recurrentes (`ContributeToGoal` recurrente).
- Splits recurrentes (SPEC-10).
- FX / canje recurrente (SPEC-16).
- Reglas cross-workspace (SPEC-14).
- Historial detallado de generadas dentro del detalle de la regla (UI de calendario / stream de eventos): fase 2 UI.
- Vista de detalle `/transactions/recurring/[id]` completa: MVP tiene detalle mínimo (nombre, cadencia, próxima ocurrencia, últimas 3 generadas, acciones).
- Adjuntos, notas ricas, tags.

## 9. Notas y hand-off

- Copy: “Recurrente” en UI, “Recurring” en código/dominio.
- Ícono: `Repeat` (lucide) tanto en submenú como en indicador del listado.
- Página padre `/transactions` = renombre de `/movimientos`; el submenú `/transactions/recurring` es una ruta hermana anidada visualmente en sidebar.
- Timezone y periodos siguen SPEC-01 / SPEC-05: “hoy”, “vencida”, “horizonte 30 días” se calculan en `User.timezone`.

### 9.1 Riesgos y decisiones abiertas

- **Borrar tx materializada no re-abre la ocurrencia** (T-38). Es coherente con idempotencia pero puede sorprender al usuario que quería “rehacer” la carga. Mitigación v1: mensaje al borrar (“esto no volverá a aparecer en tu bandeja”). Revisar en fase 2.
- **`paused` con `pausedReason='manual'` permite materializar vencidas** (T-29). Diseño: pausar frena generación futura, no impide ponerse al día. Alternativa (más estricta): pausar bloquea todo. Elegimos la primera para bajar fricción de olvidos.
- **±10% y ±3 días** son heurísticas iniciales para duplicados. Ajustables sin cambiar el contrato (constantes en dominio).
- **Cuenta archivada + auto-pausa** no notifica al usuario en v1. Fase 2: banner “Se pausaron N reglas al archivar la cuenta X”.
- **`type` y `currency` inmutables**: un cambio de tipo o de moneda equivale a otra regla; simplifica el modelo y evita ambigüedad en tx históricas.

### 9.2 Hand-off implementación (capas)

| Capa | Qué |
|------|-----|
| Domain | `src/features/recurring/domain/`: `cadence.ts` (`computeOccurrences`, `clampToEndOfMonth`), `status.ts` (`classifyOccurrence`, `OccurrenceStatus`), `materialize.ts` (`assertNotAlreadyMaterialized`, `resolveOccurredOn`), `duplicates.ts` (`findPossibleDuplicates`), `lifecycle.ts` (`shouldAutoPauseOnAccountArchive`, `canResume`). Errores de dominio: `RecurringRuleEnded`, `AlreadyMaterialized`, `NotAScheduledOccurrence`, `TooEarlyToMaterialize`. Constantes: `PREVIEW_HORIZON_DAYS=30`, `DUPLICATE_AMOUNT_TOLERANCE=0.10`, `DUPLICATE_DATE_WINDOW_DAYS=3`. Ninguna dependencia a Prisma/Next/React. |
| Services | `createRecurringRule`, `updateRecurringRule`, `pauseRecurringRule`, `resumeRecurringRule`, `endRecurringRule`, `materializeRecurringOccurrence`; `listRecurringRules`, `listPendingOccurrences`, `previewUpcomingForDashboard`. Autorización por Membership. Transacción DB al materializar (crear tx + garantizar unique `(ruleId, scheduledOn)`). Hook en `archiveAccount` que aplica auto-pausa. Extender `listTransactions` DTO con `recurring` join. |
| Schemas / actions | Zod para inputs (`frequency` enum de 4, `type` enum de 3, `amountCents > 0`, ISO dates, autz workspace). Server Actions con `getSession` + Zod. |
| Infra (Prisma) | Modelo `RecurringRule`; agregar `recurringRuleId Id?` y `scheduledOn Date?` a `Transaction` con índice único `(recurringRuleId, scheduledOn) WHERE recurringRuleId IS NOT NULL`. FK a `RecurringRule` `ON DELETE RESTRICT` (soft-delete only). Migración: nullable, no backfill. |
| UI | `/transactions` renombre; submenú `/transactions/recurring`: bandeja (secciones Vencidas / Hoy / Próximas), CTA “Nueva plantilla”, edición/pause/resume/end, detalle mínimo. Widget dashboard “Próximas recurrentes”. Indicador `Repeat` + tooltip en filas de `/transactions`. Sin lógica de negocio en componentes. |

**Tensión resuelta:** las plantillas no son transacciones; el ledger solo se mueve al materializar, con las mismas invariantes de SPEC-05 y SPEC-06. La automatización queda opt-in y postergada — v1 pide siempre confirmación humana.
```

---
