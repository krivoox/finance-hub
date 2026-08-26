# Spec 10 — Distribución de gastos (splits)

| Campo | Valor |
|-------|-------|
| ID | SPEC-10 |
| Estado | Draft (KRI-29 — sujeto = SplitGroup; dominio cerrado) |
| Prioridad | P1 |
| Dependencias | SPEC-05, SPEC-09, ADR-001, ADR-007 |

> **Pivote (KRI-29).** El split **ya no** exige `Workspace.type = group` ni `userId` de membership de tenant. El sujeto es un **`SplitGroup`** ([SPEC-09](./09-financial-groups.md)): miembros `user` o `ghost`, shares por `memberId`. El gasto de ledger sigue siendo un `Expense` del que paga (su workspace personal). Tenancy: [ADR-007](../adr/007-split-group-tenancy.md).

Las reglas de **centavos** (equal / remainder / Σ shares) se conservan. Esta spec es la fuente de invariantes profundas, errores tipados, frontera domain vs service y escenarios TDD (T-01…T-20).

## 1. Contexto

Repartir un expense entre miembros de un círculo (`SplitGroup`) y saldar con settlements (SPEC-09 H10 — incluir en v1 si el detalle del grupo queda cojo; el dominio se diseña ahora).

No se cargan gastos desde la sección Grupos. Se cargan en el formulario normal de gasto (SPEC-05) con toggle “Dividirlo con alguien”.

## 2. Historias de usuario

1. Pagué yo: quiero dividir en partes iguales entre los del grupo (default).
2. Quiero “repartirlo de otra forma” (montos exactos; % later si no entra la UI).
3. Quiero ver cuánto me deben (incl. ghosts).
4. Quiero registrar que me pagaron (settlement) — Should / SPEC-09 H10.
5. Como visitante del link público, quiero ver el mismo criterio de “quién debe” sin poder mutar.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | `CreateExpenseWithSplit`: crea expense (SPEC-05) **y** split del `SplitGroup` en la misma acción. Payer v1 = registrador. |
| FR-02 | Métodos: `equal` (default v1), `percentage`, `exact`. UI v1 puede exponer solo equal + exact. |
| FR-03 | Validar `Σ shareCents = amount` del expense |
| FR-04 | `equal`: dividir centavos; resto +1 a los primeros N miembros (orden estable por **`memberId`**) |
| FR-05 | `percentage`: convertir a centavos con la misma regla de resto; % deben sumar 100 |
| FR-06 | Settlement entre dos **miembros del mismo grupo** (H10) |
| FR-07 | Query net balances del grupo (`memberId`) |
| FR-08 | Eliminar expense con split: cascada del split (+ shares). MVP: delete en cascada |
| FR-09 | Participantes default = **todos** los miembros actuales del grupo (user + ghost). Equal no elige subset. Exact/percentage pueden omitir miembros (share implícito 0) |
| FR-10 | Preview de producto: copy SPEC-09 usando **los mismos** cents que `allocateEqual`. No hay un redondeo distinto para el preview |
| FR-11 | Alta de split exige ≥ 2 miembros actuales en el grupo |
| FR-12 | Moneda del expense = moneda del grupo; mismatch → error de dominio |
| FR-13 | Ghosts participan en allocate y nets; no pueden ser `paidByMemberId` |
| FR-14 | User-miembro de **otro** personal puede registrar el expense en **su** ledger; el IOU queda en el SplitGroup (tenant del creador) |

## 4. Modelo (lenguaje ubicuo)

```text
SplitGroup                    agregado raíz (SPEC-09)
  ├── members: SplitGroupMember[]     identidad = memberId
  ├── splits: ExpenseSplit[]
  │     └── shares: { memberId, shareCents }[]
  └── settlements: Settlement[]       fromMemberId / toMemberId
```

La `Transaction` expense **no** es parte del agregado SplitGroup: vive en el workspace personal del registrador. El split guarda `expenseTransactionId` (FK que **puede cruzar** el tenant del creador).

Definiciones:

| Término | Significado |
|---------|-------------|
| `memberId` | `SplitGroupMember.id`. Única identidad en shares, nets, payer, settlements |
| Miembro actual | fila de `SplitGroupMember` del grupo (v1 no hay baja; si se agrega `left` más adelante, “actual” = no left) |
| Payer v1 | el miembro `kind=user` del **registrador** en ese grupo (`paidByMemberId`) |
| Net de un miembro | positivo = le deben; negativo = debe. Lectura derivada; no se persiste |

## 5. Invariantes (testeables)

### 5.1 SplitGroup

1. `name` tras `trim` tiene longitud 1…80. Vacío o solo espacios → `InvalidSplitGroupNameError`.
2. El grupo **no** tiene tipo de producto. Un círculo se identifica por `name`. (La columna Prisma `kind` puede existir con default; la UI y los comandos no la exponen.)
3. `currency` se fija al crear = `workspace.baseCurrency` del creador. **Inmutable**.
4. `workspaceId` = tenant personal del creador. Nunca se reasigna.
5. `createdByUserId` es el creador; al crear queda un miembro `kind=user` con ese `userId`.
6. `publicShareToken` es único, URL-safe, unguessable (entropía de servicio; el dominio solo exige no vacío). Un token sirve para **vista pública y join** (v1). Rotar = later.
7. Rename y delete del grupo: solo `createdByUserId`. Otro user-miembro → `ForbiddenSplitGroupActionError`. Delete: cascade del círculo (splits, settlements, members); txs de ledger de cada payer permanecen.

### 5.2 SplitGroupMember

8. `kind=user` ⇔ `userId != null`. `kind=ghost` ⇔ `userId == null`.
9. Ghost: `displayName` tras `trim` longitud 1…80. Clave de unicidad = `trim(name).toLowerCase()` **por grupo**, solo entre ghosts. Duplicado (case-insensitive, trim) → `DuplicateGhostNameError`. “Juan” (ghost) y un user-miembro llamado Juan **pueden coexistir** hasta H11 (reclamo).
10. `userId` único por grupo cuando `kind=user` (`@@unique([splitGroupId, userId])`). Re-join del mismo user → `AlreadySplitGroupMemberError`.
11. Ghost **no** inicia sesión, **no** ejecuta comandos, **sí** entra en `allocate*` y en nets.
12. Un User **no** necesita `Membership` en el workspace del creador para ser miembro del grupo.
13. Baja de miembro: no el creador (`CannotRemoveGroupCreatorError`). No si el `memberId` aparece en shares, `paidBy` o settlements (`MemberHasSplitHistoryError`). Ghost: cualquier user-miembro. User no creador: puede sacarse a sí mismo. Rename de displayName: ghost → cualquier user-miembro (unicidad homónima excluyendo al propio); user → uno mismo o el creador. H11 (claim ghost) = later: **mismo** `memberId`, pasa `ghost` → `user` y setea `userId`.

### 5.3 ExpenseSplit / shares

14. `expenseTransactionId` required en v1; la tx es `type=expense`, `amountCents > 0`.
15. `paidByMemberId` v1 = miembro `kind=user` del registrador en **ese** grupo. Ghost no paga (`GhostCannotPayError`).
16. `expense.currency === splitGroup.currency` (`SplitCurrencyMismatchError`). Sin FX en splits (ADR-006).
17. La tx se crea en el workspace **personal del registrador**, que **puede diferir** de `splitGroup.workspaceId` (T-09).
18. Todos los `memberId` de shares ⊆ miembros actuales del grupo (`SplitMemberNotInGroupError`). Sin duplicados en el mismo split (`InvalidSplitInputError`).
19. `equal`: el conjunto de participantes **es** el conjunto de miembros actuales (no subset). `n >= 2` (`SplitGroupTooSmallError`).
20. `exact` / `percentage`: cada share apunta a un miembro actual; se puede omitir a alguien (implícito 0). Al menos un share `> 0`.
21. `shareCents` enteros `>= 0`. `Σ shareCents === expense.amountCents` (`SplitSumMismatchError`).
22. Algoritmo equal (normativo, sin cambio de matemática; sort por `memberId` asc, `localeCompare`):

```text
base = floor(totalCents / n)
remainder = totalCents % n
para i en 0..n-1 (members ordenados por memberId asc):
  share = base + (i < remainder ? 1 : 0)
```

100 / 3 con ids `a,b,c` → 34, 33, 33. Misma distribución que el dominio actual, solo cambia el nombre del id.

23. `percentage`: los `%` son enteros; deben sumar **exactamente** 100 **antes** de convertir (`InvalidPercentageError`). Luego floor + resto a los primeros por `memberId` asc (igual que hoy).
24. Un expense tiene **como máximo un** split (`expenseTransactionId` unique).

### 5.4 Settlement

25. `fromMemberId ≠ toMemberId`; ambos miembros actuales del mismo grupo.
26. `amountCents` entero `> 0`. Moneda = la del grupo (no se persiste otra).
27. Ghosts **pueden** ser `from` o `to` (Ana registra “Juan me pagó”). Quien **registra** el settlement es un miembro `kind=user`.
28. Semántica de nets (sin cambio): en cada split, payer se acredita el total y cada share se debita; settlement `from → to` suma `amount` al net de `from` y resta al de `to`.
29. v1 **no** topea el settlement al saldo de la pareja: un overpay puede invertir signos. Simplify debts = later (SPEC-09 H14).
30. v1 UI de balances muestra **net por miembro**, no el grafo mínimo de transferencias.

### 5.5 Cascada y delete

31. Delete del expense (SPEC-05, actor con authz de **su** ledger): borra `ExpenseSplit` + shares en la misma transacción de persistencia. Settlements **no** se tocan. Nets se recalculan sin ese split.
32. Ana **no** puede borrar el expense de Bob (no es su tenant). Bob sí; el IOU desaparece del grupo de Ana.
33. Delete de SplitGroup (creador): el service borra settlements y splits **antes** de miembros (FKs Restrict). Cascade del círculo; las txs de ledger de cada payer **permanecen**.
34. Workspace personal es inborrable → no hay cascade “se cayó el tenant del creador”.

### 5.6 Público y join

35. Token inválido / ausente → el mismo error opaco (`InvalidPublicShareTokenError`). No filtrar existencia de otros grupos.
36. Proyección pública: `name` del grupo, `displayName` de miembros, `netCents`, actividad `{ description, amountCents, paidByDisplayName }`. **Sin** `userId`, emails, cuentas, categorías internas, `workspaceId`, patrimonio.
37. Visitante público **no** ejecuta comandos (ni split, ni settlement, ni add ghost).
38. `JoinSplitGroup` (sesión): token válido, actor no es ya `kind=user` del grupo → se crea miembro user. No auto-merge con ghost homónimo (H11 later).

### 5.7 Authz (quién puede qué)

| Acción | Quién |
|--------|-------|
| `CreateSplitGroup` | Usuario autenticado; el grupo nace en **su** personal |
| `RenameSplitGroup`, `DeleteSplitGroup` | `createdByUserId` |
| `AddGhostMember`, devolver link, `CreateSettlement` | Miembro `kind=user` |
| `RenameSplitGroupMember` | Ghost: user-miembro. User: uno mismo o el creador |
| `RemoveSplitGroupMember` | Sin historial. Ghost: user-miembro. User no creador: sí mismo o el creador. Nunca el creador |
| `JoinSplitGroup` | Sesión + token; no requiere membership del tenant creador |
| `CreateExpenseWithSplit` | Miembro `kind=user` **y** membership mutadora en **su** personal (la tx) |
| `GetSplitGroup` / balances autenticados | Miembro `kind=user` (404/Forbidden para extraños; no revelar el grupo) |
| `GetPublicSplitGroup` | Token; sin sesión |

No hay rol `viewer` de SplitGroup en v1. `assertCanMutateSplits(membershipRole)` y `assertGroupWorkspace` **se eliminan**.

## 6. Errores tipados

Todos extienden `SplitDomainError`. Mensajes en inglés (código); la UI traduce.

| Clase | Cuándo |
|-------|--------|
| `InvalidSplitGroupNameError` | Nombre de grupo vacío / solo espacios / > 80 |
| `InvalidGhostNameError` | Display name de ghost vacío / solo espacios / > 80 |
| `DuplicateGhostNameError` | Ghost homónimo (trim, case-insensitive) en el mismo grupo |
| `AlreadySplitGroupMemberError` | `userId` ya es miembro `user` de ese grupo |
| `GhostCannotPayError` | `paidByMemberId` apunta a `kind=ghost` |
| `NotSplitGroupUserMemberError` | El actor no es miembro `kind=user` (service → Forbidden) |
| `ForbiddenSplitGroupActionError` | p.ej. rename/delete del grupo sin ser creador; rename/baja de un user ajeno |
| `CannotRemoveGroupCreatorError` | Intento de sacar al creador del grupo |
| `MemberHasSplitHistoryError` | Baja de un miembro con shares, pagos o settlements |
| `SplitGroupTooSmallError` | Split con `< 2` miembros actuales |
| `SplitMemberNotInGroupError` | Share / payer / settlement party no es miembro actual |
| `SplitCurrencyMismatchError` | `expense.currency !== group.currency` |
| `SplitSumMismatchError` | Σ shares ≠ total (**ya existe**) |
| `InvalidPercentageError` | % no suman 100 (**ya existe**) |
| `InvalidSplitInputError` | total ≤ 0, shares negativos, duplicados, 0 participantes, ningún share > 0 (**ya existe**) |
| `InvalidSettlementError` | from = to, amount ≤ 0 (**ya existe**; adaptar a memberId) |
| `InvalidPublicShareTokenError` | Token vacío / no matchea |
| `SplitNotFoundError` | Split / grupo inexistente para el caller autenticado (service puede colapsar a Forbidden) |

**Se eliminan:** `NotAGroupWorkspaceError`.

Mapeo de capa: `NotSplitGroupUserMemberError` y `ForbiddenSplitGroupActionError` → Forbidden en actions. El resto → 4xx de validación de dominio. Token público inválido → página de error genérica, no 403 que filtre IDs.

## 7. Frontera domain vs service

### Domain (`src/features/splits/domain/**`) — puro, TDD

- Allocate equal / percentage / exact (`memberId`).
- Nets (`computeMemberBalances`).
- Preview numérico (`previewEqualSplit`) = `allocateEqual` + derivados (base, remainder, payer share, “te deben el resto”).
- Asserts de miembro, payer, moneda, tamaño del grupo, parties de settlement, unicidad ghost, unicidad userId, tenancy del par tx↔grupo (permite workspace distinto).
- Proyección pública (qué campos salen).
- **Prohibido:** Prisma, Next, React, cookies, `getSession`, crypto RNG, SMTP, copy en español.

### Service (`src/features/splits/services/**`) — orquestación + I/O

- `getSession` + Zod viven en **actions**; el service recibe IDs ya validados.
- Cargar SplitGroup, miembros, workspace personal del actor.
- Authz: `requireMembership(actor.personalWorkspaceId)` para crear la tx; **no** `requireMembership(splitGroup.workspaceId)` para Bob.
- `CreateExpenseWithSplit`: **una** `prisma.$transaction` — expense (SPEC-05) + split + shares. Si el split falla, no queda el expense (el código actual borra a mano; preferir transacción única).
- Generate `publicShareToken` (crypto). Lookup público por token.
- Join: insertar `SplitGroupMember` `kind=user`.
- Delete expense: cascade Prisma `onDelete: Cascade` en `expenseTransactionId`.
- RLS lockdown de tablas nuevas.
- Kill: `assertGroupWorkspace`, overview de patrimonio de group WS, `CrossWorkspaceLink`.

### Actions / UI

- Actions: session + Zod + mapear errores.
- UI: interpola copy SPEC-09 con los números del preview. **No** recalcula remainder. Toggle solo en alta de **expense**.

### Attach vs create

`AttachSplitToExpense` **no** entra en v1 (SPEC-09: toggle en alta). El dominio de allocate no depende de eso. Si queda la función de servicio actual, se retira o se restringe a tests internos.

## 8. Comandos y consultas

Nombres de producto / application. El dominio expone las funciones puras de §9; el service orquesta.

| Tipo | Nombre | Notas |
|------|--------|-------|
| Command | `CreateSplitGroup` | name; miembro creador; currency freeze; token |
| Command | `RenameSplitGroup` | solo creador |
| Command | `DeleteSplitGroup` | solo creador; cascade círculo; txs quedan |
| Command | `AddGhostMember` | displayName |
| Command | `RenameSplitGroupMember` | displayName; ver §5.7 |
| Command | `RemoveSplitGroupMember` | sin historial; no el creador |
| Command | `JoinSplitGroup` | token + session |
| Command | `CreateExpenseWithSplit` | SPEC-05 + `splitGroupId`; equal default |
| Command | `CreateSettlement` | from/to `memberId` |
| Command | `DeleteSettlement` | miembro user; later si no entra H10 UI |
| Query | `ListMySplitGroups` | creador o user-miembro (union por `member.userId`, no por membership del tenant Ana) |
| Query | `GetSplitGroup` | user-miembro |
| Query | `GetPublicSplitGroup` | token; proyección FR-05 / §5.6 |
| Query | `GetSplitGroupBalances` | `computeMemberBalances` |
| Query | `ListSplits` | actividad del grupo |

## 9. Contratos de dominio (puro)

Módulo sugerido: `src/features/splits/domain/`. Reusar `allocate.ts` / `balances.ts` / `errors.ts` **renombrando** `userId` → `memberId` en los value objects. No dejar alias eternos `userId` en shares.

```ts
// --- value objects ---
export type SplitShare = { memberId: string; shareCents: number }

export type SplitGroupMemberRef = {
  memberId: string
  kind: "user" | "ghost"
  userId: string | null
  displayName: string
}

export type SplitForBalance = {
  paidByMemberId: string
  shares: readonly SplitShare[]
}

export type SettlementForBalance = {
  fromMemberId: string
  toMemberId: string
  amountCents: number
}

export type MemberBalance = {
  memberId: string
  netCents: number // + le deben; − debe
}

export type EqualSplitPreview = {
  shares: SplitShare[]
  participantCount: number
  baseCents: number
  remainderCents: number
  payerMemberId: string
  payerShareCents: number
  othersOwePayerCents: number // total − payerShare
}

export type PublicSplitActivityItem = {
  description: string | null
  amountCents: number
  paidByDisplayName: string
}

export type PublicSplitGroupProjection = {
  name: string
  members: { displayName: string; netCents: number }[]
  activity: PublicSplitActivityItem[]
}

// --- allocate (existentes; firma memberId) ---
export function allocateEqual(
  totalCents: number,
  memberIds: readonly string[],
): SplitShare[]

export function allocatePercentage(
  totalCents: number,
  percentages: readonly { memberId: string; percent: number }[],
): SplitShare[]

export function allocateExact(
  totalCents: number,
  exact: readonly { memberId: string; cents: number }[],
): SplitShare[]

export function computeMemberBalances(
  splits: readonly SplitForBalance[],
  settlements: readonly SettlementForBalance[],
  memberIds: readonly string[],
): MemberBalance[]

// --- preview (T-12): DELEGA en allocateEqual; no otra regla de resto ---
export function previewEqualSplit(input: {
  totalCents: number
  memberIds: readonly string[]
  payerMemberId: string
}): EqualSplitPreview

// --- miembros / nombres ---
export function normalizeGhostDisplayName(raw: string): string // trim
export function ghostDisplayNameKey(normalized: string): string // lower

export function assertGhostNameAvailable(input: {
  existingGhostKeys: readonly string[]
  rawName: string
}): string // returns normalized displayName or throws

export function assertUserIdAvailableInGroup(input: {
  existingUserIds: readonly string[]
  userId: string
}): void

export function assertMemberCanPay(member: SplitGroupMemberRef): void

export function assertActorIsUserMember(input: {
  members: readonly SplitGroupMemberRef[]
  userId: string
}): SplitGroupMemberRef // or throw NotSplitGroupUserMemberError

// --- split planning (T-07, T-09, T-11, T-17, T-18, T-19) ---
export function assertCanCreateExpenseSplit(input: {
  group: { currency: string; workspaceId: string }
  currentMembers: readonly SplitGroupMemberRef[]
  registrarUserId: string
  registrarPersonalWorkspaceId: string
  expense: { type: "income" | "expense" | "transfer"; amountCents: number; currency: string; workspaceId: string }
  method: "equal" | "percentage" | "exact"
  shareMemberIds: readonly string[]
}): { paidByMemberId: string }

export function assertShareParticipants(input: {
  method: "equal" | "percentage" | "exact"
  currentMemberIds: readonly string[]
  shareMemberIds: readonly string[]
}): void

// --- settlement ---
export function assertValidSettlement(input: {
  fromMemberId: string
  toMemberId: string
  amountCents: number
  currentMemberIds: readonly string[]
}): void

// --- público ---
export function projectPublicSplitGroup(input: {
  name: string
  members: readonly SplitGroupMemberRef[]
  balances: readonly MemberBalance[]
  activity: readonly {
    description: string | null
    amountCents: number
    paidByMemberId: string
  }[]
}): PublicSplitGroupProjection

export function assertPublicShareToken(token: string, expected: string): void
```

`assertCanCreateExpenseSplit` (precondiciones, T-09):

- expense `type=expense` (si no, el toggle no debería llegar; defensa: `InvalidSplitInputError`).
- `expense.workspaceId === registrarPersonalWorkspaceId` (ledger del que registra).
- `expense.workspaceId` **puede** `!== group.workspaceId`.
- `expense.currency === group.currency`.
- registrar es miembro `kind=user` → ese `memberId` es el payer.
- `currentMembers.length >= 2`.
- `assertShareParticipants` según método.

**No va en domain:** generar token, persistir, `createExpense`, cookies, RLS.

## 10. Criterios de aceptación

- [ ] Σ shares = total (propiedad en tests).
- [ ] Equal 100 / 3 = 34, 33, 33 con sort por `memberId`.
- [ ] Ana paga 9000 equal Ana+Juan (ghost, `userId=null`) → Juan net −4500, Ana +4500.
- [ ] percentage inválido (suma ≠ 100) rechazado antes de convertir.
- [ ] Create split sin ser user-miembro → `NotSplitGroupUserMemberError`.
- [ ] Token público no muta.
- [ ] Bob (otro personal) registra expense en **su** workspace; split en el grupo de Ana; Ana no ve la cuenta de Bob.
- [ ] Delete expense borra split; nets sin ese gasto.
- [ ] Preview cents === `allocateEqual`.
- [ ] Ghost duplicado (trim/case) rechazado; `userId` duplicado rechazado.
- [ ] `NotAGroupWorkspaceError` y `assertGroupWorkspace` **no existen**.

## 11. Escenarios de test (TDD)

Archivo sugerido: `src/features/splits/domain/*.test.ts`. Un describe por escenario. **Orden de implementación = orden de esta lista.** Red → green por grupo; no mezclar Prisma en estos tests.

### Cubiertos por dominio actual (adaptar `userId` → `memberId`)

#### T-01 Equal 100 / 3

- **Given** 100 cents, memberIds `"c","a","b"`
- **When** `allocateEqual`
- **Then** shares `a:34, b:33, c:33`; Σ = 100

#### T-01b Propiedad de suma

- **Given** totals `{1,2,3,99,101,1000}` y 4 memberIds
- **Then** Σ shares = total

#### T-02 Exact OK

- **Given** total 1000; shares 600+400
- **Then** aceptado tal cual (sin reordenar obligatorio; no se exige sort en exact)

#### T-03 Exact mismatch

- **Given** total 1000; shares 600+300
- **Then** `SplitSumMismatchError`

#### T-03b Exact share negativo / todos cero

- **Given** cents −1, o 0+0
- **Then** `InvalidSplitInputError`

#### T-04 Percentage

- **Given** 50%+50% sobre 101, memberIds `b,a`
- **Then** Σ = 101; tras sort `a:51, b:50`

#### T-04b Percentage inválido

- **Given** 40+40
- **Then** `InvalidPercentageError` (antes de convertir)

#### T-05 Balances (user + ghost)

- **Given** miembros `ana` (user) y `juan` (ghost, `userId=null`); Ana paga 9000 equal
- **Then** nets `ana +4500`, `juan −4500`

#### T-06 Settlement

- **Given** T-05
- **When** settlement `juan → ana` 4500
- **Then** ambos net 0

#### T-06b Settlement inválido

- **Given** from = to, o amount 0, o party que no es miembro
- **Then** `InvalidSettlementError` / `SplitMemberNotInGroupError`

### Reemplaza el viejo T-07 (personal ya no es error)

#### T-07 Personal + SplitGroup (happy)

- **Given** workspace personal de Ana + SplitGroup Casa (currency `ARS`) + ≥2 miembros; Ana es user-miembro
- **When** `assertCanCreateExpenseSplit` con expense ARS en el personal de Ana, method equal, shareMemberIds = todos
- **Then** `paidByMemberId` = miembro de Ana; **no** se lanza error de “no es group workspace”

**Borrar** los tests de `assertGroupWorkspace("personal")` → `NotAGroupWorkspaceError`.

### T-08 Ghost sin `userId`

- **Given** `SplitGroupMemberRef` `{ memberId: "m-juan", kind: "ghost", userId: null, displayName: "Juan" }` y Ana user
- **When** `allocateEqual(9000, [ana.memberId, juan.memberId])` y `computeMemberBalances`
- **Then** Juan participa; nets como T-05; `assertMemberCanPay(juan)` lanza `GhostCannotPayError`

### T-09 Payer en otro tenant personal

- **Given** SplitGroup de Ana (`group.workspaceId = ws-ana`); Bob es user-miembro; `registrarPersonalWorkspaceId = ws-bob`
- **When** `assertCanCreateExpenseSplit` con `expense.workspaceId = ws-bob`, currency alineada, type expense
- **Then** OK; `paidByMemberId` = miembro user de Bob
- **Given** el mismo Bob
- **When** `expense.workspaceId = ws-ana` (quiere escribir el ledger de Ana)
- **Then** `InvalidSplitInputError` o error de tenancy de expense (`expense.workspaceId` debe ser el personal del registrador)
- **Given** Carl **no** es miembro
- **When** intenta el assert
- **Then** `NotSplitGroupUserMemberError`

### T-10 Cascade: expense borrado

- **Given** balances T-05 (un split 9000) + un settlement 0
- **When** se recalcula `computeMemberBalances` **sin** ese split (postcondición de delete + cascade)
- **Then** nets 0 (miembros siguen en el array, nets en 0)
- **And** un settlement preexistente de 1000 seguiría contando si no se borra (settlements no cascadean con el expense)

Este escenario es **puro** (filtrar el split del input). El service debe garantizar Prisma `onDelete: Cascade` en `expenseTransactionId`; eso no se testea aquí.

### T-11 Miembro inválido / subset ilegal

- **Given** miembros actuales `{m-ana, m-juan}`
- **When** equal con `shareMemberIds = [m-ana]` (subset)
- **Then** `SplitMemberNotInGroupError` **o** error de “equal exige todos” — usar `InvalidSplitInputError` si el set no es exactamente `currentMemberIds`; si aparece un id desconocido `m-pepe` → `SplitMemberNotInGroupError`
- **When** equal con ids duplicados
- **Then** `InvalidSplitInputError`
- **When** exact con `m-pepe` (no miembro)
- **Then** `SplitMemberNotInGroupError`
- **When** grupo con 1 solo miembro
- **Then** `SplitGroupTooSmallError`

### T-12 Preview = `allocateEqual`

- **Given** total 100, memberIds `a,b,c`, payer `a`
- **When** `previewEqualSplit`
- **Then** `shares` deep-equal a `allocateEqual(100, [a,b,c])`; `baseCents=33`; `remainderCents=1`; `payerShareCents=34`; `othersOwePayerCents=66`; `participantCount=3`
- **Given** total 10000, dos miembros, payer el primero ordenado
- **Then** cada uno 5000; `othersOwePayerCents=5000` (copy “te deben el resto”)
- **And** el preview **no** introduce otro redondeo

### Ciclo de vida del grupo (dominio; complementa SPEC-09 H2–H5)

#### T-13 Crear grupo

- **Given** nombre `"  Casa  "`, `baseCurrency=ARS`
- **When** se normaliza el nombre (`trim` → `"Casa"`) y se toma currency del personal
- **Then** nombre válido; currency `ARS`
- **Given** `"   "` o `""`
- **Then** `InvalidSplitGroupNameError`

#### T-14 Ghost duplicado

- **Given** grupo con ghost `"Juan"`
- **When** `assertGhostNameAvailable` con `" juan "` o `"JUAN"`
- **Then** `DuplicateGhostNameError`
- **When** `"Juana"`
- **Then** OK, normalized `"Juana"`

#### T-15 Join / userId único

- **Given** grupo con userId `user-bob` ya miembro
- **When** `assertUserIdAvailableInGroup({ existingUserIds: ["user-bob"], userId: "user-bob" })`
- **Then** `AlreadySplitGroupMemberError`
- **When** `user-carl`
- **Then** OK

#### T-16 Proyección pública

- **Given** miembros con `userId` / `memberId`; activity con `paidByMemberId`
- **When** `projectPublicSplitGroup`
- **Then** el resultado **no** contiene `userId`, `memberId`, `workspaceId` ni nombres de cuenta; sí `displayName` + `netCents` + description/monto/paidByDisplayName
- **Given** token `""` vs esperado `"tok"`
- **When** `assertPublicShareToken`
- **Then** `InvalidPublicShareTokenError`

#### T-17 Moneda distinta

- **Given** grupo `ARS`; expense `USD`
- **When** `assertCanCreateExpenseSplit`
- **Then** `SplitCurrencyMismatchError`

#### T-18 No user-miembro

- **Given** solo ghosts + Ana; actor `user-eve` sin fila user
- **When** `assertActorIsUserMember` / `assertCanCreateExpenseSplit`
- **Then** `NotSplitGroupUserMemberError`

#### T-19 Equal exige todos

Cubierto en T-11; si se implementa `assertShareParticipants` aparte, el test de equal-subset vive ahí.

#### T-20 Ghost no paga

Cubierto en T-08; mantener un `it` explícito `assertMemberCanPay(ghost)` → `GhostCannotPayError`.

#### T-21 Delete / rename grupo (authz)

- **Given** `createdByUserId=ana`, actor `ana`
- **When** `assertCanDeleteSplitGroup` / `assertCanRenameSplitGroup`
- **Then** OK
- **Given** actor `bob` (user-miembro)
- **Then** `ForbiddenSplitGroupActionError`

#### T-22 Rename miembro

- **Given** ghost Juan; actor user-miembro
- **When** `assertCanRenameMember` sobre Juan
- **Then** OK
- **Given** user Bob; actor Ana creadora
- **Then** OK
- **Given** user Bob; actor Carl (otro user, no creador)
- **Then** `ForbiddenSplitGroupActionError`

#### T-23 Baja de miembro

- **Given** ghost sin historial; actor user-miembro
- **When** `assertCanRemoveMember`
- **Then** OK
- **Given** miembro con share, paidBy o settlement
- **Then** `MemberHasSplitHistoryError`
- **Given** target = creador
- **Then** `CannotRemoveGroupCreatorError`

## 12. Propuesta Prisma (KRI-29)

**Estrategia: migración breaking, un solo modelo.** No convivir `Workspace.group` + `SplitGroup`. No feature-flag. Pre-prod: se acepta pérdida de datos de group WS.

### 12.1 Orden de la migración

1. **Datos:** `DELETE FROM workspace WHERE type = 'group'` (cascade memberships, accounts, txs, budgets, goals, splits viejos, settlements viejos, invites de ese tenant). Los personales no se tocan.
2. **Drop grafo SPEC-14:** tabla `cross_workspace_link` + enum `CrossWorkspaceLinkKind`. Quitar relaciones en `Transaction`.
3. **Drop splits viejos:** `expense_split_share`, `expense_split`, `settlement` (el modelo actual está anclado a `workspaceId` de group WS).
4. **Drop invites de tenant:** tabla `invitation` + enum `InvitationStatus` si queda huérfano. SPEC-01: quitar `acceptPendingInvitationsForEmail`.
5. **Enum `WorkspaceType`:** el producto **no** escribe `group`. La migración **borra** tenants `group` pero **deja** el label en PostgreSQL (y Prisma lo mantiene como valor deprecado) para que un preview sin `migrate deploy` no 500 al decodificar filas viejas. Drop del label / de la columna = follow-up cuando todos los entornos ya migraron. El código de producto **no** ramifica en `type` para grupos: el shell solo activa workspaces `personal`.
6. **Create** tablas nuevas (§12.2).
7. Tras `CREATE TABLE` en `public`: `SELECT public.apply_rls_lockdown_to_public_tables();`

No migrar filas de `ExpenseSplit` viejas: los group WS ya se borraron.

### 12.2 Schema propuesto

```prisma
enum SplitGroupKind {
  ongoing
  one_time
}

enum SplitMemberKind {
  user
  ghost
}

enum SplitMethod {
  equal
  percentage
  exact
}

model SplitGroup {
  id                String         @id @default(cuid())
  workspaceId       String
  name              String
  /// leftover column; product does not expose group kind
  kind              SplitGroupKind @default(ongoing)
  currency          String
  publicShareToken  String         @unique
  createdByUserId   String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  workspace Workspace           @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  members   SplitGroupMember[]
  splits    ExpenseSplit[]
  settlements Settlement[]

  @@index([workspaceId])
  @@index([createdByUserId])
  @@map("split_group")
}

model SplitGroupMember {
  id                String          @id @default(cuid())
  splitGroupId      String
  kind              SplitMemberKind
  userId            String?
  displayName       String
  /// lower(trim(displayName)); solo ghosts (users = null → UNIQUE permite varios NULL)
  displayNameKey    String?
  createdAt         DateTime        @default(now())

  splitGroup SplitGroup @relation(fields: [splitGroupId], references: [id], onDelete: Cascade)

  paidSplits      ExpenseSplit[]      @relation("SplitPaidBy")
  shares          ExpenseSplitShare[]
  settlementsFrom Settlement[]        @relation("SettlementFrom")
  settlementsTo   Settlement[]        @relation("SettlementTo")

  @@unique([splitGroupId, userId])
  @@unique([splitGroupId, displayNameKey])
  @@index([userId])
  @@map("split_group_member")
}

model ExpenseSplit {
  id                   String      @id @default(cuid())
  splitGroupId         String
  expenseTransactionId String      @unique
  paidByMemberId       String
  method               SplitMethod
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt

  splitGroup SplitGroup        @relation(fields: [splitGroupId], references: [id], onDelete: Cascade)
  expense    Transaction       @relation(fields: [expenseTransactionId], references: [id], onDelete: Cascade)
  paidBy     SplitGroupMember  @relation("SplitPaidBy", fields: [paidByMemberId], references: [id], onDelete: Restrict)
  shares     ExpenseSplitShare[]

  @@index([splitGroupId])
  @@index([paidByMemberId])
  @@map("expense_split")
}

model ExpenseSplitShare {
  id         String @id @default(cuid())
  splitId    String
  memberId   String
  shareCents Int

  split  ExpenseSplit     @relation(fields: [splitId], references: [id], onDelete: Cascade)
  member SplitGroupMember @relation(fields: [memberId], references: [id], onDelete: Restrict)

  @@unique([splitId, memberId])
  @@index([memberId])
  @@map("expense_split_share")
}

model Settlement {
  id              String   @id @default(cuid())
  splitGroupId    String
  fromMemberId    String
  toMemberId      String
  amountCents     Int
  occurredOn      DateTime @db.Date
  note            String?
  createdByUserId String
  createdAt       DateTime @default(now())

  splitGroup SplitGroup       @relation(fields: [splitGroupId], references: [id], onDelete: Cascade)
  fromMember SplitGroupMember @relation("SettlementFrom", fields: [fromMemberId], references: [id], onDelete: Restrict)
  toMember   SplitGroupMember @relation("SettlementTo", fields: [toMemberId], references: [id], onDelete: Restrict)

  @@index([splitGroupId, occurredOn])
  @@map("settlement")
}
```

Notas de integridad:

| Tema | Decisión |
|------|----------|
| `@@unique([splitGroupId, userId])` | En PostgreSQL varios `NULL` en `userId` (ghosts) son distintos → OK. Domain igual exige `userId` null iff ghost. |
| `@@unique([splitGroupId, displayNameKey])` | Users tienen `displayNameKey=null` (varios NULL OK). Ghosts: service persiste `ghostDisplayNameKey(trim(name))`. Domain es la fuente de la regla; el unique es red de seguridad. |
| FK `ExpenseSplit.expense → Transaction` | **Cruza tenants.** `onDelete: Cascade` (T-10). No hay `workspaceId` en `ExpenseSplit`. |
| `paidBy` / shares / settlement parties | `onDelete: Restrict` (v1 no borra miembros). |
| `SplitGroup.workspace` | `onDelete: Cascade` (defensa; el personal no se borra). |
| Token | `String @unique`, generado en service (~32 bytes base64url). |
| `Workspace.expenseSplits` / `Workspace.settlements` | **Quitar** esas relaciones; el ancla es `SplitGroup`. |
| `User` | Opcional: relación `splitGroupMembers` por `userId` (sin FK obligatoria si se prefiere no acoplar Better Auth). Preferir **FK** `userId → User` `onDelete: Restrict` en miembros `user` (ghosts null). Prisma: relación opcional. |
| Check DB | No hay CHECK `kind` vs `userId` en Prisma; domain + service. Opcional SQL: `CHECK ((kind = 'user' AND userId IS NOT NULL) OR (kind = 'ghost' AND userId IS NULL))`. **Incluir el CHECK** en la migración SQL. |

### 12.3 Qué hacer con piezas viejas

| Pieza | Destino |
|-------|---------|
| `WorkspaceType.group` | Borrar **rows** de tenants `group`. El label del enum PG queda unused (Prisma lo decodifica) hasta un follow-up post-migrate |
| `Workspace.type` columna | Se queda (`personal` only) este PR; código deja de ramificar grupos por `type` |
| `Invitation` + `InvitationStatus` | **Drop.** Invites de producto = token de SplitGroup. No dejar tabla vacía. |
| `CrossWorkspaceLink` + enum | **Drop.** SPEC-14 retirada. |
| `ExpenseSplit.workspaceId` / `paidByUserId` / `ExpenseSplitShare.userId` | **No existen** en el modelo nuevo |
| `NotAGroupWorkspaceError`, `assertGroupWorkspace`, `assertCanMutateSplits(role)` | Borrar código y tests |
| `WorkspaceHasCrossLinks`, `AccountHasCrossWorkspaceLinksError` | Borrar con SPEC-14 |
| `acceptPendingInvitationsForEmail` | Borrar (SPEC-01) |
| Membership `admin/member/viewer` | Se quedan en schema (personal usa `owner`); sin producto de group. No es este diseño ampliar/reducir roles de tenant |

### 12.4 Authz en queries Prisma (recordatorio de service)

`ListMySplitGroups(userId)`:

```text
SplitGroupMember where userId = ? AND kind = user
  → include SplitGroup
```

**Incorrecto:** `SplitGroup where workspaceId = activeWorkspace` (eso solo lista los que Ana **creó**, no a los que Bob se unió).

`CreateExpenseWithSplit`: tx.workspaceId = personal de Bob; split.splitGroupId = grupo de Ana.

## 13. Fuera de alcance

- Splits en incomes / transfers / fx / recurrentes (SPEC-18)
- Integración de cobro (Mercado Pago, etc.)
- Simplify debts (min transactions) — H14
- Payer = ghost sin tx de ledger — H13
- Payer ≠ registrador — H13
- UI de split **dentro** de `/groups` como alta de gasto
- Editar split a posteriori
- Subset de miembros en equal
- Rotar token público
- Reclamo de ghost (H11) — documentado; no TDD v1 salvo que entre el slice
- Cerrar grupo one-time (H12)
- Convivencia con workspace `group`

## 14. Código actual a retirar (dominio)

- `assertGroupWorkspace`, `NotAGroupWorkspaceError`
- `paidByUserId` / `SplitShare.userId` / `MemberBalance.userId` / `SplitForBalance.paidByUserId` / `SettlementForBalance.fromUserId`
- `assertCanMutateSplits(role)` (viewer de tenant)
- Tests `describe("assertGroupWorkspace")`

Sustituir por `memberId`. Reusar el cuerpo de `allocateEqual` / `allocatePercentage` / `allocateExact` / `computeMemberBalances`.

## 15. Relación con SPEC-09 y ADR-007

- Copy, empty, link WhatsApp, kill list de UI: SPEC-09.
- Tenancy: ADR-007 (este documento no reabre “¿el grupo es un tenant?”).
- Payer v1 = registrador; equal default; remainder por `memberId`; currency freeze; ghosts P0; SPEC-14 retirada — decisiones de PM, no reabrir.

## 16. Hand-off a `software-engineer`

Listo para TDD. Orden: **tests de §11 en orden T-01…T-20** → domain §9 → kill Prisma/group WS (§12.1) → services/actions → UI. No UI de splits sin domain verde. No reintroducir `assertGroupWorkspace`.
