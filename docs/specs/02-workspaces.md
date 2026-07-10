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
- Invitación expira (ej. 7 días).

## 6. Comandos y consultas

| Tipo | Nombre | Input | Output |
|------|--------|-------|--------|
| Command | `CreateGroupWorkspace` | name, baseCurrency | Workspace |
| Command | `RenameWorkspace` | workspaceId, name | Workspace |
| Command | `InviteMember` | workspaceId, email, role | Invitation |
| Command | `AcceptInvitation` | token | Membership |
| Command | `ChangeMemberRole` | workspaceId, userId, role | Membership |
| Command | `RemoveMember` | workspaceId, userId | void |
| Command | `TransferOwnership` | workspaceId, newOwnerUserId | void |
| Query | `ListMyWorkspaces` | — | Workspace[] |
| Query | `ListMembers` | workspaceId | Membership[] |

## 7. Criterios de aceptación

- [ ] No se puede dejar un workspace sin owner.
- [ ] Invitación a email ya miembro → error idempotente claro.
- [ ] Viewer no puede mutar (verificado en application layer).

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

## 9. Fuera de alcance

- Facturación por workspace
- Workspaces plantilla / clone

## 10. Notas

Toda spec posterior asume `workspaceId` + authz por membership.
