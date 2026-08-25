# Spec 02 — Workspaces

| Campo | Valor |
|-------|-------|
| ID | SPEC-02 |
| Estado | Draft — **group tenant retirado por KRI-29** |
| Prioridad | P0 |
| Dependencias | SPEC-01 |

> **KRI-29 / SPEC-09.** El producto **ya no** ofrece workspaces `type=group`. El Workspace sigue siendo el tenant (ADR-002) y cada usuario conserva **exactamente su workspace personal** (inborrable). Los “grupos” de producto son `SplitGroup` ([SPEC-09](./09-financial-groups.md)), no un segundo ledger. El ABM de esta spec (crear grupo-tenant, switcher, invites de membership, leave/delete de group WS) es **kill list**: no implementar más; eliminar código en el epic KRI-29. Lo que sigue abajo describe el modelo *anterior* hasta que el SE borre esas FRs.

## 1. Contexto

El Workspace es la unidad de tenancy (ADR-002). Agrupa cuentas, movimientos, presupuestos y objetivos del **espacio personal**.

Esta spec cubría el **ABM de workspaces grupales** (crear, listar/switch, renombrar, salir, eliminar, gestionar miembros) y las reglas que el workspace **personal** no se elimina nunca. Post KRI-29: solo aplica lo relativo al **personal**.

## 2. Actores

- Owner, Admin, Member, Viewer

## 3. Historias de usuario

1. Como usuario, quiero ver mis workspaces y elegir en cuál trabajo.
2. Como owner, quiero crear un workspace grupal para el hogar.
3. Como owner/admin, quiero invitar miembros por email.
4. Como owner, quiero cambiar roles de miembros.
5. Como member (u otro rol no-único-owner), quiero **salir** de un workspace grupal.
6. Como owner/admin, quiero **renombrar** el workspace (UI + backend).
7. Como owner, quiero **eliminar** un workspace grupal de forma irreversible (hard-delete), tras confirmar el nombre.
8. Como owner/admin, quiero **remover** miembros y, como owner, **transferir ownership** desde la UI del grupo.
9. Tras salir o eliminar el workspace **activo**, quiero quedar en otro workspace (preferencia: personal).

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Listar workspaces del usuario actual |
| FR-02 | Crear workspace `group` con nombre y `baseCurrency`; setear workspace activo y dirigir a onboarding si no hay cuentas (SPEC-15) |
| FR-03 | Renombrar workspace (owner/admin) — backend y UI |
| FR-04 | Invitar usuario existente o pendiente por email |
| FR-05 | Aceptar / rechazar invitación |
| FR-06 | Cambiar role de membership (owner/admin; ownership solo vía transfer) |
| FR-07 | Remover miembro (no el último owner); self-leave permitido con las mismas invariantes |
| FR-08 | Transferir ownership (solo owner; previo owner → `admin`) |
| FR-09 | Contexto activo de workspace en la sesión de UI (cookie/header/path) |
| FR-10 | **DeleteGroupWorkspace**: hard-delete real del workspace `group` y de todos sus datos de tenant; solo **owner**; irreversible (sin grace / restore) |
| FR-11 | Bloquear delete si el workspace participa en vínculos cross-workspace (SPEC-14): `CrossWorkspaceLink` **u** txs con cuenta de otro workspace / cuentas locales usadas desde otro workspace — **no** cortar vínculos automáticamente |
| FR-12 | Tras `LeaveGroupWorkspace` o `DeleteGroupWorkspace` del workspace activo → setear otro workspace activo (**preferir personal**) |
| FR-13 | UI de confirmación type-to-confirm: el usuario debe escribir el **nombre exacto** del grupo antes de eliminar (validación de producto en UI; el servidor puede re-validar el nombre como defensa) |

## 5. Reglas de negocio

### 5.1 Tenancy y roles

- Workspace `personal` se crea en registro; **nunca se elimina** (ni hard-delete ni soft-archive de workspace en v1 / cercano).
- Siempre ≥ 1 owner.
- `viewer`: solo queries.
- `member`: crear/editar transacciones propias según políticas de grupo; no gestionar miembros.
- `admin`: gestionar miembros excepto transferir ownership.
- `owner`: control total (incl. delete group + transfer ownership).
- Invitación expira en **7 días**.
- Canal MVP: **link copiable** en UI (+ log en consola en desarrollo). Sin SMTP obligatorio.
- Al **registrarse** con un email que tiene invitaciones `pending` vigentes: se crea el workspace personal **y** se aceptan automáticamente esas invitaciones (memberships).
- `AcceptInvitation` es **idempotente** si la invitación ya fue aceptada y el usuario ya es miembro.
- Roles invitables: `admin` | `member` | `viewer` (nunca `owner` por invitación).

### 5.2 Leave (salir del grupo)

- Solo aplica a workspaces `type = group`.
- `LeaveGroupWorkspace` = el caller se remueve a sí mismo (equivalente a `RemoveMember` con `targetUserId = caller`).
- No se puede salir del workspace **personal** → `CannotLeavePersonal`.
- No se puede salir si el caller es el **último owner** → `CannotLeaveAsLastOwner` (misma invariante que `CannotRemoveLastOwner`).
- Member/viewer/admin pueden salir; owner solo si queda ≥1 owner.

### 5.3 Delete (eliminar grupo) — hard-delete (excepción explícita)

> **Excepción a la regla transversal del domain-model** (“preferir soft-delete / archive”).  
> El delete de un workspace **`group`** es **hard-delete consciente de producto**: los datos del tenant se borran de verdad. Sin grace period, sin restore, sin soft-archive de workspace. Documentado también en `docs/domain-model.md`.

Precondiciones (todas deben cumplirse):

1. Caller autenticado con membership **owner** en el workspace; si no → `Forbidden`.
2. `workspace.type === "group"`; si `personal` → `CannotDeletePersonal`.
3. No existen vínculos cross-workspace que involucren al workspace (ver §5.4); si hay → `WorkspaceHasCrossLinks`.
4. (UI) Confirmación type-to-confirm del nombre exacto; (opcional servidor) si se envía `confirmName` y no coincide → `ConfirmationNameMismatch`.

Postcondiciones:

- El row `Workspace` y **todo** el grafo de datos del tenant dejan de existir (ver orden de borrado en §11).
- Memberships e invitaciones del workspace eliminadas.
- Si el workspace eliminado era el activo del caller → cookie/contexto activo apunta a otro workspace del usuario, **preferir personal** (`ResolveActiveWorkspaceAfterRemoval`).
- Otros usuarios que tenían ese workspace activo: en la próxima resolución de activo, la cookie inválida cae al fallback (personal / primera membership) — comportamiento ya existente en `getActiveWorkspaceForUser`.

### 5.4 Vínculos que bloquean delete (SPEC-14)

Se considera que el workspace **tiene vínculos cross-workspace** (bloquear delete) si ocurre **cualquiera**:

| Señal | Criterio |
|-------|----------|
| A. `CrossWorkspaceLink` | Existe un link cuya `sourceTransaction` **o** `targetTransaction` pertenece a este `workspaceId` |
| B. Cuenta foreign en txs locales | Existe `Transaction` con `workspaceId` = este workspace cuyo `account.workspaceId` ≠ este workspace |
| C. Cuenta local usada desde otro WS | Existe `Transaction` con `workspaceId` ≠ este workspace cuyo `accountId` apunta a una `FinanceAccount` de este workspace |

**No** se eliminan ni se “cortan” esos vínculos automáticamente. El usuario debe resolverlos antes (p. ej. borrar aportes / reasignar movimientos según SPEC-14).

### 5.5 Rename / members (MVP mismo epic)

- Rename: owner/admin; nombre trimmeado no vacío (validación Zod en action).
- Change role: owner/admin; admin no toca owners ni otorga `owner` (usar `TransferOwnership`).
- Remove member: owner/admin (admin no remueve owner); last-owner protected.
- Transfer: solo owner; previo owner → `admin`; target debe ser miembro.

## 6. Comandos y consultas

| Tipo | Nombre | Input | Output / errores |
|------|--------|-------|------------------|
| Command | `CreateGroupWorkspace` | name, baseCurrency | Workspace |
| Command | `RenameWorkspace` | workspaceId, name | Workspace · `Forbidden` |
| Command | `InviteMember` | workspaceId, email, role | Invitation (+ inviteUrl) |
| Command | `AcceptInvitation` | token | Membership / workspaceId |
| Command | `ChangeMemberRole` | workspaceId, userId, role | Membership · `Forbidden` · `CannotRemoveLastOwner` |
| Command | `RemoveMember` | workspaceId, userId | void · `Forbidden` · `CannotRemoveLastOwner` |
| Command | `LeaveGroupWorkspace` | workspaceId | void · `CannotLeavePersonal` · `CannotLeaveAsLastOwner` · `Forbidden` |
| Command | `TransferOwnership` | workspaceId, newOwnerUserId | void · `Forbidden` · `InvalidTransfer` |
| Command | `DeleteGroupWorkspace` | workspaceId, confirmName? | `{ nextActiveWorkspaceId }` · ver errores §6.1 |
| Query | `ListMyWorkspaces` | — | Workspace[] |
| Query | `ListMembers` | workspaceId | Membership[] |
| Query | `GetInvitationByToken` | token | InvitationPreview \| null |
| Query | `ListPendingInvitations` | workspaceId | Invitation[] |
| Query | `WorkspaceHasCrossWorkspaceInvolvement` | workspaceId | boolean (uso interno pre-delete) |

### 6.1 Errores tipados (dominio)

| Error | Cuándo |
|-------|--------|
| `Forbidden` | Sin membership, rol insuficiente, admin toca owner, etc. |
| `CannotRemoveLastOwner` | Remove/demote dejaría 0 owners |
| `CannotLeaveAsLastOwner` | Leave del último owner (alias semántico del anterior en path leave) |
| `CannotLeavePersonal` | Intento de leave sobre `type=personal` |
| `CannotDeletePersonal` | Intento de delete sobre `type=personal` |
| `WorkspaceHasCrossLinks` | Delete bloqueado por §5.4 |
| `ConfirmationNameMismatch` | `confirmName` presente y ≠ nombre actual (si el servidor lo exige) |
| `InvalidTransfer` | Transfer a self / no-miembro / caller no owner |
| `NotFound` | Workspace inexistente (capa application; no filtrar existencia a no-miembros más allá de Forbidden) |

## 7. Criterios de aceptación

### Ya cubiertos (regresión)

- [x] No se puede dejar un workspace sin owner.
- [x] Invitación a email ya miembro → error idempotente claro.
- [x] Viewer no puede mutar (verificado en application layer).
- [x] UI en `/groups`: owner/admin invita, copia link, ve pending.
- [x] Página pública `/invitaciones/[token]` para registro/login/aceptar.
- [x] Registro desde invitación → workspace personal + membership en el grupo + workspace activo del grupo.
- [x] `CreateGroupWorkspace` setea workspace activo y redirige a `/onboarding` (SPEC-15).

### ABM MVP (esta iteración)

- [ ] Owner/admin renombra desde UI; member/viewer → `Forbidden`.
- [ ] Member sale del grupo; último owner no puede salir (`CannotLeaveAsLastOwner`).
- [ ] No se puede salir del personal (`CannotLeavePersonal`).
- [ ] Owner elimina grupo vacío de vínculos: datos borrados; workspace desaparece de listados.
- [ ] Delete con `CrossWorkspaceLink` / cuenta foreign → `WorkspaceHasCrossLinks` (datos intactos).
- [ ] Delete de `personal` → `CannotDeletePersonal`.
- [ ] Delete por non-owner → `Forbidden`.
- [ ] Tras delete/leave del activo → activo = personal (si existe).
- [ ] UI type-to-confirm exige nombre exacto.
- [ ] Change role / remove / transfer ownership disponibles en UI del grupo.

## 8. Escenarios de test (TDD)

### T-01 Crear grupo

- **Given** usuario autenticado  
- **When** `CreateGroupWorkspace`  
- **Then** workspace type=group, creator=owner

### T-02 No remover último owner

- **Given** un solo owner  
- **When** `RemoveMember` del owner  
- **Then** error `CannotRemoveLastOwner`

### T-03 Transfer ownership

- **Given** owner A y member B  
- **When** transfer a B  
- **Then** B=owner, A=admin (regla fija)

### T-04 Viewer no muta

- **Given** role viewer  
- **When** intenta `RenameWorkspace`  
- **Then** error `Forbidden`

### T-05 Aceptar invitación

- **Given** invitación válida  
- **When** accept  
- **Then** membership creada; invitación consumida

### T-06 Auto-accept al registro

- **Given** invitación pending para `a@b.com`  
- **When** `RegisterUser` con ese email  
- **Then** workspace personal + membership en el workspace invitado

### T-07 Rename — owner/admin ok

- **Given** membership owner o admin  
- **When** `RenameWorkspace` con nombre válido  
- **Then** nombre actualizado

### T-08 Leave — happy path

- **Given** group con owner A y member B; B es member  
- **When** B ejecuta `LeaveGroupWorkspace`  
- **Then** B sin membership; A sigue owner; workspace existe

### T-09 Leave — último owner

- **Given** group con un solo owner (y opcionalmente members)  
- **When** el owner ejecuta `LeaveGroupWorkspace`  
- **Then** `CannotLeaveAsLastOwner`

### T-10 Leave — personal

- **Given** workspace personal del usuario  
- **When** `LeaveGroupWorkspace`  
- **Then** `CannotLeavePersonal`

### T-11 Delete — happy path (sin cross-links)

- **Given** group G, caller owner, sin vínculos §5.4, con cuentas/txs locales  
- **When** `DeleteGroupWorkspace(G)`  
- **Then** G y datos tenant inexistentes; listados del owner ya no incluyen G

### T-12 Delete — bloqueado por CrossWorkspaceLink

- **Given** group G con aporte (link) hacia/desde otro workspace  
- **When** `DeleteGroupWorkspace(G)`  
- **Then** `WorkspaceHasCrossLinks`; G y datos intactos

### T-13 Delete — bloqueado por cuenta foreign / uso externo

- **Given** expense en G pagado con cuenta de otro WS, **o** expense en otro WS con cuenta de G  
- **When** `DeleteGroupWorkspace(G)`  
- **Then** `WorkspaceHasCrossLinks`

### T-14 Delete — personal

- **Given** workspace personal  
- **When** `DeleteGroupWorkspace`  
- **Then** `CannotDeletePersonal`

### T-15 Delete — non-owner

- **Given** caller admin/member/viewer de group G  
- **When** `DeleteGroupWorkspace(G)`  
- **Then** `Forbidden`

### T-16 Post-delete / post-leave — workspace activo

- **Given** cookie activa = G; usuario tiene personal P y G  
- **When** leave o delete de G  
- **Then** activo = P (`ResolveActiveWorkspaceAfterRemoval`)

### T-17 Resolve active — prefer personal

- **Given** remaining = [group H, personal P] (cualquier orden)  
- **When** `pickPreferredActiveWorkspace(remaining)`  
- **Then** P

## 9. Fuera de alcance

- Facturación por workspace
- Workspaces plantilla / clone
- Envío de email transaccional (SMTP / Resend) — P2
- UI completa de reject invitation
- **Delete / archive del workspace `personal`**
- **Soft-archive de workspace** (group o personal)
- **Grace period / papelera / restore** tras delete
- Auto-resolver o auto-borrar vínculos SPEC-14 al eliminar
- Delete masivo / admin platform

## 10. Notas

Toda spec posterior asume `workspaceId` + authz por membership.

First-run post-creación (cuentas + preview): [SPEC-15 — Onboarding de workspace](./15-workspace-onboarding.md).

Guía de producto: [workspaces-and-invites.md](../guides/workspaces-and-invites.md).

Cross-workspace: [SPEC-14](./14-cross-workspace-money.md).

Implementación (servidor): `getActiveWorkspaceForUser`, `requireMembership` y `listMyWorkspaces` están memoizados por request con `React.cache` (args primitivos). Varios services en paralelo en la misma página solo resolven membership una vez. **No** hay cache entre requests ni TTL de roles — ver [architecture.md §7.1](../architecture.md).

### 10.1 Inventario de implementación actual (baseline)

| Capacidad | Domain | Service/Action | UI |
|-----------|--------|----------------|----|
| Create group | — | sí | sí |
| List / switcher | — | sí | sí |
| Rename | `assertCanRename` | sí | falta |
| Leave (self remove) | last-owner | vía `removeMember` self | falta |
| Delete group | **nuevo** | **nuevo** | **nuevo** |
| Change role / remove / transfer | sí | sí | parcial / falta pulir en epic |

## 11. Orden de borrado propuesto (service-level transaction)

Prisma: varios FKs hijos usan `onDelete: Restrict` hacia `FinanceAccount` / `Category` / `RecurringRule`. **No** confiar en un único `workspace.delete()` cascade para el grafo completo. Ejecutar en **`$transaction`** (orden ↓ = primero):

```text
0. Preconditions (domain): owner + type=group + !hasCrossWorkspaceInvolvement
1. CurrencyExchange          WHERE workspaceId
2. GoalContribution          via Goal.workspaceId
3. ExpenseSplitShare         via ExpenseSplit.workspaceId
4. ExpenseSplit              WHERE workspaceId
5. Settlement                WHERE workspaceId
6. Transaction               WHERE workspaceId
   (CrossWorkspaceLink cascada desde Transaction — solo seguro tras gate §5.4)
7. RecurringRule             WHERE workspaceId
8. BudgetCategory            via Budget.workspaceId
9. Budget                    WHERE workspaceId
10. Goal                     WHERE workspaceId  (null linkedAccountId si hace falta antes)
11. Category                 hijos antes que padres (Restrict parentId) WHERE workspaceId
12. FinanceAccount           WHERE workspaceId
13. WorkspaceConsolidationRate WHERE workspaceId (o cascade al borrar workspace)
14. Invitation               WHERE workspaceId
15. Membership               WHERE workspaceId
16. Workspace                WHERE id
```

UsdQuoteSnapshot/Line son **globales** (no tenant) — no se tocan.

Tras éxito: `setActiveWorkspaceCookie(nextId)` si el eliminado era el activo del caller.

## 12. Frontera domain vs service

| En domain (puro, TDD) | En service (I/O / orquestación) |
|------------------------|----------------------------------|
| `assertCanDeleteGroupWorkspace(role, type)` | Query cross-involvement (Prisma) |
| `assertCanLeaveWorkspace(type, members, userId)` | Transacción ordenada de borrado |
| Errores tipados §6.1 | Cookie activo post leave/delete |
| `pickPreferredActiveWorkspace(remaining)` | Zod + session + `requireMembership` |
| Predicados authz existentes (rename, transfer, last-owner) | `WorkspaceHasCrossWorkspaceInvolvement` query |

La detección §5.4 es **regla de negocio** (qué cuenta como vínculo) implementada como query en service (o helper de domain que recibe flags/booleanos ya leídos). El domain no importa Prisma.
