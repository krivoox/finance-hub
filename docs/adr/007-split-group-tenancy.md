# ADR 007 — Workspace personal + SplitGroup (enmienda a ADR-002)

## Estado

Aceptado (KRI-29)

Enmienda a [ADR-002](./002-workspace-tenancy.md). No reescribe la historia del ADR-002: el hogar *fue* un workspace `group`; **deja de serlo**.

## Contexto

ADR-002 unificó tenancy y “hogar”: todo dato financiero vive en un Workspace, y el hogar era un workspace `type=group` con varios `Membership`.

Eso mezcló **patrimonio** (cuentas, presupuestos, objetivos) con **quién pagó el asado**. Obligaba a la otra persona a instalar la app y entrar al tenant de Ana. [SPEC-09](../specs/09-financial-groups.md) retira el workspace grupal. [SPEC-14](../specs/14-cross-workspace-money.md) (aportes Personal↔Casa) pierde su motivo de ser.

Hace falta una regla de tenancy que:

1. Conserve Workspace como tenant del **ledger personal** (Better Auth, membership, Prisma, authz de cuentas/txs).
2. Modele el círculo interpersonal como algo que **no** es un tenant.
3. Permita que Bob vea el asado de Ana **sin** `Membership` en el workspace de Ana.

## Decisión

### 1. Workspace = tenant personal

- El Workspace sigue siendo la unidad de tenancy del **ledger** (cuentas, categorías, transacciones, presupuestos, objetivos, recurrentes, canjes).
- En producto hay **un workspace personal por usuario**, inborrable, con `Membership` `owner`.
- `Workspace.type = group` **deja de existir** como producto y como valor persistido. La migración KRI-29 borra los tenants `group` y su grafo (breaking, sin convivencia de modelos).
- Invitar gente al ledger (`Invitation` de tenant) **se retira**. No hay segundo tenant al que unirse.

### 2. SplitGroup = círculo de splits, no tenant

- El hogar / el asado es un **`SplitGroup`** (SPEC-09 / SPEC-10).
- Dueño de datos: `SplitGroup.workspaceId` = workspace personal del **creador**. No se “switch-ea”.
- Identidad en shares, balances y settlements: **`SplitGroupMember.id` (`memberId`)**, nunca `User.id` ni membership de workspace.
- Miembros: `kind=user` (cuenta en la app) o `kind=ghost` (solo `displayName`, sin `userId`).

### 3. Authz colaborativa por miembro, no por Membership ajena

| Superficie | Cómo se autoriza |
|------------|------------------|
| Ledger (cuentas, txs, budgets, goals) | `workspaceId` + `Membership` del **propio** personal. Sin cambio. |
| SplitGroup (ver, mutar círculo, shares, settlements) | El actor es `SplitGroupMember` `kind=user` de ese grupo **o** es el `createdByUserId` (que siempre es miembro user al crear). |
| Vista pública `/s/[token]` | Token `publicShareToken`; **sin** sesión. Solo lectura; proyección limitada (nombres + nets + actividad). |
| Alta de expense con split | Membership en el personal **del registrador** (crea la tx) **y** miembro `user` del SplitGroup (crea el IOU). |

**Excepción explícita a ADR-002:** un user-miembro **no** necesita `Membership` en el workspace del creador. No ve cuentas ni movimientos de Ana. Solo la proyección del grupo.

Bob registra un gasto en **su** ledger; el `ExpenseSplit` se ancla al `SplitGroup` (tenant de Ana). El cruce de tenants es un **FK de IOU → tx**, no un segundo ledger compartido.

### 4. Qué se elimina con esta enmienda

- Workspace `group` (crear, switcher, patrimonio del grupo, leave/delete de tenant grupal).
- `Invitation` de tenant y auto-accept de esas invites al registrarse.
- `CrossWorkspaceLink` y toda SPEC-14.
- Gate de dominio `assertGroupWorkspace` / `NotAGroupWorkspaceError`.
- Shares / settlements claveados por `userId` de membership de group WS.

## Consecuencias

- Queries de **dinero** siguen llevando `workspaceId` + membership del personal.
- Queries/comandos de **SplitGroup** llevan `splitGroupId` + verificación de `SplitGroupMember` (o token público). **Prohibido** llamar `requireMembership(creador.workspaceId)` para dejar entrar a Bob.
- Roles de tenant (`admin` / `member` / `viewer`) dejan de aplicar a “grupos”. En SplitGroup v1 no hay rol `viewer`.
- Prisma: ver propuesta en [SPEC-10 § Prisma](../specs/10-expense-splitting.md#12-propuesta-prisma-kri-29). Migración breaking; no feature-flag de convivencia.
- Authz del ledger no se relaja: Bob **no** puede leer/escribir el workspace de Ana.
- RLS deny-all para `anon` / `authenticated` sigue; tablas nuevas (`split_group`, etc.) entran al lockdown (`apply_rls_lockdown_to_public_tables`).

## Alternativas rechazadas

| Alternativa | Motivo |
|-------------|--------|
| Reescribir ADR-002 in-place | Borra historia; el ADR original fue correcto para el producto anterior. |
| Organization de Better Auth como tenant de grupo | Nueva tenancy; el issue pide no mezclar patrimonio con splits. |
| Convivir `Workspace.group` + `SplitGroup` (flag) | Código muerto; SPEC-09 opción B descartada. |
| Exigir membership en el personal de Ana para ver el grupo | Reproduce el dolor: instalar la app y entrar a un tenant ajeno. |
