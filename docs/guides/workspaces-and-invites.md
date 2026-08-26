# Workspaces y grupos

Guía corta de producto sobre tenancy (workspace personal) y gastos divididos.

> **KRI-29.** El workspace **grupal como tenant** (cuentas compartidas, switcher, `/invitaciones` de membership) **se retiró**. Cada usuario tiene un workspace **personal**. Los círculos de gastos (casa, asado, personas sin la app, link de WhatsApp) son `SplitGroup`: [SPEC-09](../specs/09-financial-groups.md) y [SPEC-10](../specs/10-expense-splitting.md).

## Workspace personal

| Qué | Cómo |
|-----|------|
| Origen | Se crea al registrarse |
| Uso | Cuentas, movimientos, presupuestos y objetivos de esa persona |
| Activo | Cookie `fh-workspace-id`; no hay switcher porque no hay otro tenant |

No hay “cuenta personal dentro del grupo”: el ledger es siempre el personal. El grupo solo guarda **quién debe a quién**.

## First-run (onboarding)

Tras **registrarte**, si el espacio no tiene cuentas, la app abre `/onboarding`:

1. Nombrar el espacio y elegir moneda.
2. Crear al menos una cuenta (obligatorio).
3. Opcional: registrar un primer gasto.
4. Ir al panel.

Si omitís el setup sin cuentas, no se vuelve a forzar el redirect (cookie `fh-setup-dismissed`); en **Cuentas** sigue el CTA “Configurar espacio”.

Detalle: [15-workspace-onboarding.md](../specs/15-workspace-onboarding.md).

## Grupos de gastos (`SplitGroup`)

En **Grupos**:

1. Creá un círculo: “Algo que sigue” (casa) o “Algo de una vez” (asado).
2. Sumá gente **solo con el nombre** (ghost) o mandá el enlace `/s/{token}` (WhatsApp). La otra persona **no necesita la app** para ver quién debe.
3. Los gastos **no** se cargan en Grupos: al registrar un gasto, tildá «Dividirlo con alguien» y elegí el grupo. Por defecto, partes iguales.

Quien tiene la app puede abrir el enlace e **entrar al grupo** (membership de SplitGroup, no del workspace de otra persona). No ve cuentas ni movimientos ajenos: solo nombres, splits y balances.

Detalle: [SPEC-09](../specs/09-financial-groups.md).

## Roles del workspace personal

El tenant personal sigue usando membership (`owner` al registrarse). Viewer/admin existen en el modelo, pero el producto no invita a un segundo tenant.

| Rol | Ver datos | Mutar finanzas | Renombrar espacio |
|-----|-----------|----------------|-------------------|
| owner / admin | Sí | Sí | Sí |
| member | Sí | Sí | No |
| viewer | Sí | No | No |

El workspace **personal** no se elimina nunca.

## Ajustes

En **Ajustes → Workspace**:

- Renombrar el espacio personal
- Tasa de consolidación ARS/USD

Los grupos se administran en `/groups`, no en Ajustes.
