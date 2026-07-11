# Spec 02 — Workspaces

| Campo | Valor |
|-------|-------|
| ID | SPEC-02 |
| Estado | Draft |
| Prioridad | P0 |
| Dependencias | SPEC-01 |

## 1. Contexto

El Workspace es la unidad de tenancy (ADR-002). Agrupa cuentas, movimientos y, si es grupal, miembros y gastos compartidos.

## 2. Actores

- Owner, Admin, Member, Viewer

## 3. Historias de usuario

1. Como usuario, quiero ver mis workspaces y elegir en cuál trabajo.
2. Como owner, quiero crear un workspace grupal para el hogar.
3. Como owner/admin, quiero invitar miembros por email.
4. Como owner, quiero cambiar roles de miembros.
5. Como member, quiero salir de un workspace grupal (si no soy el único owner).

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Listar workspaces del usuario actual |
| FR-02 | Crear workspace `group` con nombre y `baseCurrency` |
| FR-03 | Renombrar workspace (owner/admin) |
| FR-04 | Invitar usuario existente o pendiente por email |
| FR-05 | Aceptar / rechazar invitación |
| FR-06 | Cambiar role de membership |
| FR-07 | Remover miembro (no el último owner) |
| FR-08 | Transferir ownership |
| FR-09 | Contexto activo de workspace en la sesión de UI (cookie/header/path) |

## 5. Reglas de negocio

- Workspace `personal` se crea en registro; no se elimina en MVP (solo archivar futuro).
- Siempre ≥ 1 owner.
- `viewer`: solo queries.
- `member`: crear/editar transacciones propias según políticas de grupo; no gestionar miembros.
- `admin`: gestionar miembros excepto transferir ownership.
- `owner`: control total.
- Invitación expira en **7 días**.
- Canal MVP: **link copiable** en UI (+ log en consola en desarrollo). Sin SMTP obligatorio.
- Al **registrarse** con un email que tiene invitaciones `pending` vigentes: se crea el workspace personal **y** se aceptan automáticamente esas invitaciones (memberships).
- `AcceptInvitation` es **idempotente** si la invitación ya fue aceptada y el usuario ya es miembro.
- Roles invitables: `admin` | `member` | `viewer` (nunca `owner` por invitación).

## 6. Comandos y consultas

| Tipo | Nombre | Input | Output |
|------|--------|-------|--------|
| Command | `CreateGroupWorkspace` | name, baseCurrency | Workspace |
| Command | `RenameWorkspace` | workspaceId, name | Workspace |
| Command | `InviteMember` | workspaceId, email, role | Invitation (+ inviteUrl) |
| Command | `AcceptInvitation` | token | Membership / workspaceId |
| Command | `ChangeMemberRole` | workspaceId, userId, role | Membership |
| Command | `RemoveMember` | workspaceId, userId | void |
| Command | `TransferOwnership` | workspaceId, newOwnerUserId | void |
| Query | `ListMyWorkspaces` | — | Workspace[] |
| Query | `ListMembers` | workspaceId | Membership[] |
| Query | `GetInvitationByToken` | token | InvitationPreview \| null |
| Query | `ListPendingInvitations` | workspaceId | Invitation[] |

## 7. Criterios de aceptación

- [x] No se puede dejar un workspace sin owner.
- [x] Invitación a email ya miembro → error idempotente claro.
- [x] Viewer no puede mutar (verificado en application layer).
- [x] UI en `/groups`: owner/admin invita, copia link, ve pending.
- [x] Página pública `/invitaciones/[token]` para registro/login/aceptar.
- [x] Registro desde invitación → workspace personal + membership en el grupo + workspace activo del grupo.

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
- **Then** B=owner, A=admin (o member según regla fija: A pasa a admin)

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

## 9. Fuera de alcance

- Facturación por workspace
- Workspaces plantilla / clone
- Envío de email transaccional (SMTP / Resend) — P2
- UI completa de reject invitation

## 10. Notas

Toda spec posterior asume `workspaceId` + authz por membership.

Guía de producto: [workspaces-and-invites.md](../guides/workspaces-and-invites.md).
