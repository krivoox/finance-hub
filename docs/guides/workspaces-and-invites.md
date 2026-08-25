# Workspaces e invitaciones

Guía corta de producto sobre tenancy, grupos y cómo sumar personas.

> **KRI-29.** El workspace **grupal como tenant** (cuentas compartidas, switcher, `/invitaciones` de membership) **se retira**. El usuario queda con su workspace **personal**. Los círculos de gastos (casa, asado, ghosts, link de WhatsApp) son `SplitGroup`: ver [SPEC-09](../specs/09-financial-groups.md) y [SPEC-10](../specs/10-expense-splitting.md). El resto de esta guía describe el modelo **anterior** hasta que el epic elimine esa UI.

## Personal vs grupal

| Tipo | Origen | Uso |
|------|--------|-----|
| **personal** | Se crea al registrarse | Finanzas individuales del usuario |
| **group** | Lo crea un owner (Ajustes / Grupos) | Hogar o pareja: cuentas compartidas y balances entre miembros |

Un usuario puede pertenecer a varios workspaces. El **activo** se elige en el selector del sidebar (cookie `fh-workspace-id`). Dashboard, cuentas y movimientos muestran solo el activo.

No hay “cuenta personal dentro del grupo”: lo personal y lo compartido se separan **cambiando de workspace**.

## First-run (onboarding)

Tras **registrarte** o **crear un workspace grupal**, si el espacio activo no tiene cuentas, la app abre `/onboarding`: un modal a pantalla completa (sin menú lateral) para:

1. Nombrar el espacio y elegir moneda.
2. Crear al menos una cuenta (obligatorio).
3. Opcional: registrar un primer gasto.
4. Ir al panel.

Si omitís el setup sin cuentas, no se vuelve a forzar el redirect (cookie `fh-setup-dismissed`); en **Cuentas** sigue el CTA “Configurar espacio”.

Detalle: [15-workspace-onboarding.md](../specs/15-workspace-onboarding.md).

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
   - **Sin cuenta** → registro (email prefijado) **o Continuar con Google** (mismo email) → workspace personal + membership en el grupo + ese grupo queda activo.
   - **Con cuenta** (mismo email) → login, Continuar con Google, o botón “Unirme” → membership + workspace activo.

El email de Google debe **coincidir** con el de la invitación (case-insensitive), igual que el path email/password. El flujo OAuth debe preservar el token (`fh-invite-token` / `callbackURL`). Detalle: [SPEC-01](../specs/01-auth.md) + [SPEC-02](../specs/02-workspaces.md).

## Qué ve cada uno

- En el **personal**: cuentas/movimientos de ese workspace, más débitos/créditos por gastos o ingresos registrados en otro espacio que usan tus cuentas.
- En el **grupo**: las mismas cuentas y movimientos del hogar, más balances de splits/settlements.
- Un `viewer` del grupo ve todo en lectura; no puede invitar ni registrar liquidaciones.

## Gestionar el espacio (ABM)

En **Ajustes → Workspace** / **Grupos** (SPEC-02):

| Acción | Quién | Notas |
|--------|-------|--------|
| Renombrar | owner / admin | Nombre visible en el switcher |
| Cambiar rol / remover miembro | owner / admin | No se puede dejar el grupo sin owner |
| Transferir ownership | solo owner | El owner previo pasa a `admin` |
| Salir del grupo | cualquier miembro (no último owner) | Si era el activo → pasás al **personal** |
| **Eliminar grupo** | solo **owner** | Hard-delete irreversible; type-to-confirm del nombre |

El workspace **personal** no se elimina nunca.

Antes de eliminar un grupo, no puede haber vínculos con otros espacios (aportes / pagos con cuenta ajena — SPEC-14). Si los hay, la app **bloquea** el delete hasta que los resuelvas; no se cortan solos.

Detalle: [02-workspaces.md](../specs/02-workspaces.md).

## Dinero entre espacios

Dos flujos (no son transferencias internas):

| Flujo | Qué hace |
|-------|----------|
| **Aportar a otro espacio** | Sale de una cuenta tuya e ingresa a una cuenta de otro workspace (fondear Casa). |
| **Pagar con cuenta de otro espacio** | El movimiento se **registra** en el workspace activo (categoría, presupuesto, split) y el saldo se **descuenta** de la cuenta elegida (p. ej. Visa personal). |

En el formulario: resumen claro **“Se registra en …”** vs **“Se descuenta de …”**.  
Otros miembros del grupo no ven el nombre de tu cuenta personal.

Detalle: [14-cross-workspace-money.md](../specs/14-cross-workspace-money.md).

## Referencias

- Spec: [02-workspaces.md](../specs/02-workspaces.md)
- Onboarding: [15-workspace-onboarding.md](../specs/15-workspace-onboarding.md)
- Grupos / splits: [09-financial-groups.md](../specs/09-financial-groups.md), [10-expense-splitting.md](../specs/10-expense-splitting.md)
- Detalle movimiento: [13-transaction-detail.md](../specs/13-transaction-detail.md)
- ADR tenancy: [002-workspace-tenancy.md](../adr/002-workspace-tenancy.md)
