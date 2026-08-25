# Spec 10 — Distribución de gastos (splits)

| Campo | Valor |
|-------|-------|
| ID | SPEC-10 |
| Estado | Draft (KRI-29 — sujeto = SplitGroup, no workspace group) |
| Prioridad | P1 |
| Dependencias | SPEC-05, SPEC-09 |

> **Pivote (KRI-29).** El split **ya no** exige `Workspace.type = group` ni `userId` de membership de tenant. El sujeto es un **`SplitGroup`** (SPEC-09): miembros `user` o `ghost`, shares por `memberId`. El gasto de ledger sigue siendo un `Expense` del que paga (su workspace personal).

Las reglas de **centavos** (equal / remainder / Σ shares) se conservan. El detalle fino de invariantes y TDD extra (ghosts, join, tx en otro tenant): **`business-logic-architect`**.

## 1. Contexto

Repartir un expense entre miembros de un círculo (`SplitGroup`) y, si entra en el MVP (SPEC-09 H10), saldar con settlements.

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
| FR-06 | Settlement entre dos **miembros del mismo grupo** (si H10) |
| FR-07 | Query net balances del grupo (`memberId`) |
| FR-08 | Eliminar expense con split: cascada del split (+ shares). MVP: delete en cascada |
| FR-09 | Participantes default = **todos** los miembros actuales del grupo (user + ghost). No se elige subset en v1 salvo que custom lo permita |
| FR-10 | Preview de producto (no es regla de redondeo distinta): copy SPEC-09 (“le toca $X a cada uno… vos pusiste todo”) usando los shares ya calculados |

## 4. Reglas de negocio

- El `SplitGroup` debe existir; el registrador debe ser miembro `kind=user` de ese grupo.
- `paidByMemberId` v1 = el miembro user del registrador en ese grupo.
- Todos los `memberId` de shares deben ser miembros **actuales** del grupo (ghost o user).
- Shares >= 0; al menos un share > 0.
- Settlement: amount > 0; from ≠ to; ambos miembros del grupo.
- Settlement reduce la deuda neta entre esas personas (misma semántica que hoy).
- **No** hay `NotAGroupWorkspace`. Un split en workspace personal es el camino feliz.
- Moneda: amount.currency = moneda del grupo (v1 = base del personal del creador). Mismatch → error de dominio (nombre a cargo del arquitecto).
- Ghosts entran en la asignación como cualquier miembro.
- El visitante público **no** ejecuta comandos.

### Algoritmo equal (normativo — sin cambio de matemática)

```text
base = floor(totalCents / n)
remainder = totalCents % n
para i en 0..n-1 (members ordenados por memberId asc):
  share = base + (i < remainder ? 1 : 0)
```

Antes el sort era `userId`. Ahora es `memberId`. Los tests T-01 deben actualizarse al nuevo id, **misma** distribución 100 → 34/33/33 para tres ids ordenados.

## 5. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Command | `CreateExpenseWithSplit` |
| Command | `AttachSplitToExpense` (¿v1? preferir solo create atómico; attach = later) |
| Command | `CreateSettlement` |
| Command | `DeleteSettlement` |
| Query | `GetSplitGroupBalances` |
| Query | `ListSplits` (actividad del grupo) |

## 6. Criterios de aceptación

- [ ] Suma de shares siempre = total (propiedad en tests).
- [ ] Equal 100 / 3 = 34, 33, 33 con sort por memberId.
- [ ] Balances netos correctos con un ghost (Ana paga 9000 equal Ana+Juan → Juan debe 4500).
- [ ] percentage inválido (suma ≠ 100) rechazado antes de convertir.
- [ ] Create split sin ser user-miembro → Forbidden.
- [ ] Create split de un grupo ajeno / token público → no muta.

## 7. Escenarios de test (TDD)

### Cubiertos por dominio actual (adaptar ids)

#### T-01 Equal 100 / 3

- **Given** 100 cents, memberIds a,b,c  
- **Then** 34, 33, 33

#### T-02 Exact OK

- **Given** total 1000; shares 600+400  
- **Then** aceptado

#### T-03 Exact mismatch

- **Given** total 1000; shares 600+300  
- **Then** error `SplitSumMismatch`

#### T-04 Percentage

- **Given** 50%+50% sobre 101  
- **Then** shares suman 101 (regla resto)

#### T-05 Balances (user + ghost)

- **Given** Ana paga 9000; equal Ana+Juan (ghost)  
- **Then** Juan debe 4500 a Ana (net)

#### T-06 Settlement

- **Given** Juan debe 4500  
- **When** settlement Juan→Ana 4500  
- **Then** net = 0

### Reemplaza T-07 Personal workspace (ya no es error)

#### T-07 Personal + SplitGroup (happy)

- **Given** workspace personal + SplitGroup Casa  
- **When** `CreateExpenseWithSplit`  
- **Then** expense + split creados; no se lanza error de “no es group workspace”

### Pendiente de `business-logic-architect` (mínimo a añadir)

- T-08 Ghost sin `userId` participa en equal y en nets.
- T-09 User-miembro de otro workspace personal registra expense en **su** ledger y split en el grupo (si el epic permite payer ≠ owner).
- T-10 Delete expense cascada split.
- T-11 Subset ilegal / miembro dado de baja no puede aparecer en shares.
- T-12 Preview cents coinciden con `allocateEqual`.

## 8. Fuera de alcance

- Splits en incomes / transfers / fx / recurrentes (SPEC-18)
- Integración de cobro (Mercado Pago, etc.)
- Simplify debts (min transactions)
- Payer = ghost sin tx de ledger (SPEC-09 H13)
- UI de split **dentro** de `/groups` como alta de gasto

## 9. Notas

- Código actual a retirar: `assertGroupWorkspace`, `NotAGroupWorkspaceError`, `paidByUserId` / `ExpenseSplitShare.userId` como identidad. Sustituir por `memberId`.
- `allocateEqual` / `allocatePercentage` / `allocateExact` / `computeMemberBalances` se **reusan**; cambia el nombre del id en el value object (`userId` → `memberId` o un alias `participantId`).
- SPEC-09 define copy, ghosts, link público y kill del tenant grupal.
