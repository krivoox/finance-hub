# Workspaces e invitaciones

Guía corta de producto sobre tenancy, grupos y cómo sumar personas.

## Personal vs grupal

| Tipo | Origen | Uso |
|------|--------|-----|
| **personal** | Se crea al registrarse | Finanzas individuales del usuario |
| **group** | Lo crea un owner (Ajustes / Grupos) | Hogar o pareja: cuentas compartidas y balances entre miembros |

Un usuario puede pertenecer a varios workspaces. El **activo** se elige en el selector del sidebar (cookie `fh-workspace-id`). Dashboard, cuentas y movimientos muestran solo el activo.

No hay “cuenta personal dentro del grupo”: lo personal y lo compartido se separan **cambiando de workspace**.

## Roles

| Rol | Ver datos | Mutar finanzas | Gestionar miembros / invitaciones | Transferir ownership |
|-----|-----------|----------------|-----------------------------------|----------------------|
| owner | Sí | Sí | Sí | Sí |
| admin | Sí | Sí | Sí (sin ownership) | No |
| member | Sí | Sí | No | No |
| viewer | Sí | No | No | No |

En un grupo, todos ven patrimonio consolidado y “quién debe a quién”. Solo owner/admin invitan.

## Cómo invitar

1. Activá un workspace **group**.
2. En **Grupos**, sección miembros: ingresá email + rol (`admin` / `member` / `viewer`).
3. Copiá el link `/invitaciones/{token}` (válido 7 días). En desarrollo también se loguea en consola.
4. La otra persona abre el link:
   - **Sin cuenta** → registro (email prefijado) → workspace personal + membership en el grupo + ese grupo queda activo.
   - **Con cuenta** (mismo email) → login o botón “Unirme” → membership + workspace activo.

## Qué ve cada uno

- En el **personal**: solo sus cuentas/movimientos de ese workspace.
- En el **grupo**: las mismas cuentas y movimientos del hogar, más balances de splits/settlements.
- Un `viewer` del grupo ve todo en lectura; no puede invitar ni registrar liquidaciones.

## Referencias

- Spec: [02-workspaces.md](../specs/02-workspaces.md)
- Grupos / splits: [09-financial-groups.md](../specs/09-financial-groups.md), [10-expense-splitting.md](../specs/10-expense-splitting.md)
- ADR tenancy: [002-workspace-tenancy.md](../adr/002-workspace-tenancy.md)
