# Spec 09 — Grupos de gastos divididos (Split Groups)

| Campo | Valor |
|-------|-------|
| ID | SPEC-09 |
| Estado | Draft (KRI-29 — pivote de producto) |
| Prioridad | P1 |
| Dependencias | SPEC-02 (tenant personal), SPEC-05, SPEC-10 |
| Issue | KRI-29 |

> **Pivote (KRI-29).** Esta spec **reemplaza** el modelo anterior: un grupo ya **no** es un workspace `type=group` con cuentas compartidas, switcher ni invitaciones de tenant. El grupo es un **círculo de splits** que vive dentro del workspace **personal** del usuario. Ver §3 (decisión de tenancy) y [SPEC-02](./02-workspaces.md).

## 1. Contexto y actores

Hoy los “grupos” se confunden con un segundo espacio financiero (cuentas, patrimonio, onboarding, switcher). El usuario no entiende cuándo cambiar de workspace ni cómo cargar un asado o el súper de la casa. La otra persona además **tiene que instalar la app** y entrar a un tenant ajeno.

El trabajo a cubrir es **repartir gastos entre personas**, no compartir un ledger.

### Personas

| Persona | Momento |
|---------|---------|
| Individuo con la app | Carga un gasto desde el teléfono (formulario normal) y lo reparte |
| Pareja / casa | Mismo círculo durante meses; balances acumulados |
| Asado / salida | Círculo corto; se comparte un enlace por WhatsApp |
| Persona **sin** la app (ghost o visitante del enlace) | No instala nada; igual entra en el reparto y/o ve quién debe |

### Jobs-to-be-done

1. Crear un círculo (casa o asado) en segundos, con una mano.
2. Sumar gente **solo con el nombre** (sin cuenta) **o** con un enlace si ya usa la app.
3. Al cargar un gasto mío, marcarlo como dividido y ver cuánto le toca a cada uno.
4. Mandar un enlace: los demás ven quién debe **sin instalar**.

## 2. Problema e hipótesis

- **Dolor:** el workspace grupal mezcla patrimonio compartido con “quién pagó el asado”. Es difícil de administrar y de explicar. Los no-usuarios quedan afuera.
- **Hipótesis:** si el grupo es un círculo de splits sobre **mis** cuentas personales, el usuario carga gastos como siempre, reparte en el mismo form, y comparte un link. Señal de éxito: un grupo creado + un gasto dividido + un ghost o un visitante del link, sin switcher de workspace.

## 3. Decisión de producto — Workspace vs grupo

### Qué dice el issue

> Deshabilitar la feature de workspace grupal, dejando solo las cuentas personales. Comenzar de cero.

### Interpretación **rechazada**

Eliminar el **concepto de Workspace** (tenancy). Rompería ADR-002, Better Auth + membership, Prisma, authz de **todo** el ledger (cuentas, txs, budgets, goals). No es coherente con el stack.

### Interpretación **aceptada** (KRI-29)

| Se elimina | Se conserva |
|------------|-------------|
| `Workspace.type = group` como producto (crear, switcher, invites de tenant, dashboard de patrimonio del grupo, leave/delete de grupo-tenant) | **Workspace personal** como única unidad de tenancy (ADR-002) |
| Cuentas, categorías, presupuestos y patrimonio **del hogar-como-tenant** | Un usuario = un workspace personal (el de siempre al registrarse) |
| Dinero cross-workspace (SPEC-14) cuyo motivo de ser era pagar el hogar desde el personal | Membership `owner` del personal; roles de tenant dejan de aplicar a “grupos” |

**El hogar / el asado pasa a ser `SplitGroup`**, no un tenant.

Conflicto con ADR-002: el ADR original dice que el hogar *es* un workspace grupal. **Enmienda vigente:** [ADR-007](../adr/007-split-group-tenancy.md) — Workspace = tenant personal; los grupos interpersonales son `SplitGroup` con acceso colaborativo vía `SplitGroupMember`, no vía `Membership` de un tenant ajeno.

Excepción de authz (producto): un `SplitGroup` tiene **dueño de datos** = workspace personal del creador, pero **otros usuarios-miembro** lo ven sin ser members del workspace de Ana. No ven cuentas ni movimientos personales de Ana, solo la proyección del grupo (nombres, splits, balances).

## 4. Opciones consideradas

| Opción | Valor para el usuario | Complejidad percibida | Veredicto |
|--------|----------------------|------------------------|-----------|
| A. Seguir con workspace `group` + copy | Cero aprendizaje nuevo en dominio | Sigue sin entenderse | Descartada |
| B. Feature-flag del group WS y convivir | Menos riesgo de migración | Dos modelos a la vez; código muerto | Descartada (el issue pide cero código muerto) |
| C. Solo personal + `SplitGroup` (ghosts + link público + split en el form de gasto) | Encaja asado/casa/WhatsApp | Un corte limpio | **Elegida** |

Riesgo principal de C: usuarios que ya usaban el workspace grupal como ledger del hogar pierden ese espacio. Aceptado: **comenzar de cero** (pre-prod / breaking).

## 5. Historias de usuario (priorizadas)

### P0 — Must

**H1. Empty state**

> Como usuario en mi workspace personal, quiero ver en Grupos un empty que me explique el asado/casa y un CTA “Crear un grupo”, para entender el producto sin pensar en workspaces.

**H2. Crear grupo**

> Como usuario, quiero crear “Un grupo nuevo” con un nombre, para tener un círculo al que imputar gastos.

**H2b. Editar y borrar grupo**

> Como creador, quiero cambiar el nombre del grupo o eliminarlo, para corregir un error o cerrar un círculo que ya no uso.

**H3. Miembro ghost**

> Como creador/miembro, quiero sumar a alguien **solo con el nombre**, para repartir aunque no tenga la app.

**H3b. Editar y sacar miembros**

> Como miembro con cuenta, quiero corregir el nombre de alguien o sacarlo del grupo si todavía no hay gastos ni cobros, para no dejar gente de más.

**H4. Invitar quien ya tiene la app**

> Como creador/miembro, quiero mandarle un enlace a quien **tiene Plata**, para que se sume como usuario-miembro y vea el grupo en su app.

**H5. Link público (sin instalar)**

> Como creador, quiero copiar un enlace para WhatsApp, para que cualquiera vea quién debe **sin cuenta**.

**H6. Split desde el gasto (default iguales)**

> Como usuario que carga un **gasto** en el formulario normal, quiero un toggle “Dividirlo con alguien”, elegir el grupo, y ver un preview de partes iguales (“en Casa, entre 2: le toca $X a cada uno. Vos pusiste todo…”), para no ir a la sección Grupos a cargar el gasto.

**H7. Listado y balances del grupo**

> Como usuario-miembro, quiero abrir el grupo y ver miembros + quién debe a quién + actividad de splits, para saber cómo estamos.

**H7b. Gastos del grupo por categoría**

> Como usuario-miembro, en el detalle del grupo quiero una tab «Gastos por categoría» junto al listado de movimientos, con el mismo donut del panel («Distribución de gastos»), para ver en qué se fue la plata compartida.

**H8. El grupo no es un tenant**

> Como usuario, quiero **solo mis cuentas personales** (sin switcher de espacios grupales), para no mezclar patrimonio con deudas de asado.

### P1 — Should

**H9. Split custom**

> Como usuario, quiero “Repartirlo de otra forma” (montos exactos; porcentajes si ya existen en dominio), para alquiler o súper desigual.

**H10. Saldar**

> Como usuario-miembro, quiero registrar que alguien me pagó su parte (settlement), para que el balance vuelva a cero.

**H11. Ghost que después tiene app**

> Como owner, quiero que un usuario que abre el invite pueda **vincularse** a un ghost existente (mismo nombre/slot), para no duplicar a “Juan”.

### P2 — Could / later

**H13.** Registrar “pagó un ghost / otro miembro” **sin** debitar mi cuenta.  
**H14.** Simplify debts (mínimo de transferencias).  
**H15.** Ledger compartido del hogar (cuentas de Casa) — **no** es este producto.

## 6. MVP y fuera de alcance

### Entra en v1 (Must)

- Kill de workspace grupal + switcher + invites de tenant + UI/services asociados (ver §10).
- Migración breaking: borrar workspaces `group` existentes y su grafo (aceptado).
- `SplitGroup` en el workspace personal: create, list, detail, rename y delete (creador).
- **Sin tipo de grupo.** Todos son grupos con un nombre. No hay `ongoing` / `one_time` en producto ni en el listado.
- Miembros: el creador (user) + ghosts por nombre + user-miembros vía enlace. Rename de displayName y baja si no hay historial de splits/settlements.
- Enlace **público de solo lectura** (token) con nombres + balances + lista corta de gastos del grupo. Sin cuentas, sin saldos de ledger.
- Enlace o CTA **Unirme** para usuarios logueados (H4). Reclamar ghost (H11) puede ir en el mismo slice o inmediato P1 — si no entra, documentar duplicados.
- Toggle de split **solo en alta de expense** (no income, no transfer, no desde `/groups` como form de carga).
- Default: partes iguales entre **todos** los miembros actuales del grupo (incl. ghosts). Preview normativo.
- Payer v1 = **quien registra** (su cuenta se debita; “vos pusiste todo”).
- Moneda del grupo = `workspace.baseCurrency` al crear. Expense de otra moneda → `SplitCurrencyMismatchError` (SPEC-10).
- Delete del expense con split: cascada del split (igual espíritu SPEC-10 actual).
- Authz: viewer de **workspace** ya no aplica a grupos; en SplitGroup no hay rol `viewer` en v1.

### Later (Should/Could explícitos)

- “Repartirlo de otra forma” (H9) — dominio `exact`/`percentage` **ya existe**; si el corte de UI aprieta, el dominio puede quedar testeado y la UI custom en el mismo epic o inmediatamente después. Preferencia de producto: **incluir exact en v1** si el form no se hincha; percentage puede esperar.
- Settlements (H10) — **incluir si el detalle del grupo queda cojo** (balances que nunca bajan). Mínimo: “Ya me pagó” entre dos miembros.
- Reclamo de ghost (H11).
- Payer ≠ yo (H13).
- Editar split a posteriori; splits en recurrentes (SPEC-18).
- SMTP; QR; Mercado Pago.

### Explícitamente no (v1)

- Workspace `group` (crear, switch, patrimonio consolidado del grupo, onboarding de grupo).
- SPEC-14 (aportes Personal↔Casa, expense funded externo, labels de privacidad de cuenta ajena, twins).
- Cuentas del grupo, presupuestos del grupo, objetivos del grupo.
- Subgrupos, proyectos, roles admin/viewer de SplitGroup.
- Cobranza integrada.
- Cache/SW de balances (SPEC-20: el link público es dinámico, `noindex`, sin HTML stale).
- Mentir saldos offline.

## 7. Requisitos funcionales (producto)

| ID | Requisito |
|----|-----------|
| FR-01 | `/groups` lista los SplitGroups del usuario (creador o user-miembro). Empty: copy del asado + CTA “Crear un grupo”. **No** hay form de carga de gasto aquí. Footer/nota: los gastos divididos se cargan al registrar un gasto. |
| FR-02 | Crear grupo: título “Un grupo nuevo”; **solo nombre** (placeholder “Casa, Asado del sábado…”). Sin selector de tipo. |
| FR-02b | El creador puede **renombrar** el grupo y **eliminarlo**. Delete: cascade de miembros, splits y settlements; las txs de ledger de cada payer **permanecen**. Confirmación explícita (nombre). |
| FR-03 | Agregar miembro: (a) enlace de invitación **visible** en el detalle (URL a la vista + copiar + WhatsApp); (b) “Sólo el nombre” (ghost). |
| FR-03b | ABM de miembros: renombrar displayName; sacar a alguien **sin** historial (shares, payer o settlements). No se saca al creador. Un user-miembro no creador puede irse si no tiene historial. |
| FR-04 | Link público copiable; la URL se muestra en el detalle (no solo clipboard). Página sin auth con proyección limitada (FR-05). El origin del enlace es el host de la request (alias de preview / prod), no un hostname efímero. |
| FR-05 | Proyección pública: nombre del grupo, miembros (solo `displayName`), net balances, actividad de splits (descripcion/monto/quién pagó). Sin cuentas, categorías internas, ni patrimonio. |
| FR-06 | Alta de expense: si el usuario tiene ≥1 grupo, toggle “Dividirlo con alguien”. Selector de grupo. Default iguales entre miembros del grupo. Preview en lenguaje natural. Link “Repartirlo de otra forma” (H9). |
| FR-07 | Sin grupos: el toggle no aparece o lleva a crear grupo (no callejón sin salida). |
| FR-08 | User-miembro ve el grupo en **su** app (su workspace personal); no cambia de tenant. |
| FR-09 | Kill list §10 ejecutada: cero UI/actions de group workspace; cero código muerto. |
| FR-10 | Query de balances del grupo reutiliza el motor de SPEC-10 (miembro = `memberId`, no `userId` de workspace). |
| FR-11 | Detalle autenticado (`/groups/[id]`): la card de movimientos tiene tabs «Movimientos» (listado actual: splits + settlements) y «Gastos por categoría» (donut + leyenda, mismo componente visual que el panel). Solo **splits**; settlements no entran. Monto = `expense.amountCents` (total del gasto, no la parte del actor). Agrupa por `categoryId` de la tx (SPEC-11); sin categoría → «Sin categoría». Ventana = **todos** los splits del grupo (no “este mes”). Vista pública: **sin** categorías (FR-05). |

Copy de referencia (empty):

- Eyebrow: “Sobre tus cuentas”
- Título: “Repartí un gasto entre varios”
- Cuerpo: el grupo no es otra cuenta; el movimiento se carga en tu ledger y se imputa a las personas. Quien no tiene la app entra sólo con el nombre; el enlace muestra los saldos.
- CTA: “Crear un grupo”

Preview de referencia (form gasto):

> En «Casa», 2 personas · ARS X cada una. Tu cuenta cubre el total.

## 8. Criterios de aceptación (Given / When / Then)

Agrupados por historia. Verificables en pantalla o por test de dominio (montos).

### H1 Empty

- **Given** usuario autenticado, workspace personal, 0 SplitGroups  
- **When** abre `/groups`  
- **Then** ve el empty (título de producto + copy ledger/ghost/enlace + CTA “Crear un grupo”); no ve switcher de workspace grupal ni “creá un workspace grupal”

### H2 Crear

- **Given** empty o listado  
- **When** crea grupo nombre “Casa”  
- **Then** el grupo existe; el creador es miembro `user`; aparece en `/groups` **sin** etiqueta de tipo; moneda = base del personal

- **Given** soy el creador del grupo “Casa”  
- **When** lo renombro a “Depto”  
- **Then** el listado y el detalle muestran “Depto”

- **Given** soy el creador  
- **When** confirmo eliminar el grupo  
- **Then** desaparece de `/groups`; los gastos cargados en cuentas personales siguen

- **Given** soy user-miembro y **no** creador  
- **When** intento renombrar o borrar el grupo  
- **Then** se rechaza (`ForbiddenSplitGroupActionError`)

- **Given** nombre vacío o solo espacios  
- **When** submit  
- **Then** no se crea (validación)

### H3 Ghost

- **Given** grupo “Casa”  
- **When** agrego miembro “Juan” (sólo nombre)  
- **Then** Juan figura como ghost; puedo splittearlo; Juan no tiene login

- **Given** mismo grupo, nombre duplicado (case-insensitive trim)  
- **When** agrego otro “juan”  
- **Then** rechazo claro (no dos ghosts homónimos en el mismo grupo)

- **Given** ghost “Juan” sin gastos ni cobros  
- **When** lo renombro a “Juancito”  
- **Then** figura “Juancito”; la clave homónima se actualiza

- **Given** ghost o user-miembro **sin** shares, pagos ni settlements  
- **When** lo saco del grupo (o me voy, si no soy el creador)  
- **Then** deja de aparecer en miembros y en splits nuevos

- **Given** alguien con historial de split o settlement  
- **When** intento sacarlo  
- **Then** rechazo claro (`MemberHasSplitHistoryError`)

- **Given** soy el creador  
- **When** intento sacarme del grupo  
- **Then** rechazo (`CannotRemoveGroupCreatorError`); el camino es eliminar el grupo

### H4 Invite usuario

- **Given** grupo “Casa”  
- **When** abre el detalle  
- **Then** ve el enlace `/s/{token}` a la vista (input de solo lectura), puede copiarlo y mandarlo por WhatsApp; no depende de que el clipboard funcione

- **Given** grupo + enlace de invitación  
- **When** un usuario logueado (distinto del owner) acepta  
- **Then** es user-miembro; ve el grupo en **su** `/groups`; **no** entra al workspace personal de Ana; **no** ve las cuentas de Ana

- **Given** visitante no logueado del invite  
- **When** abre el enlace  
- **Then** puede ver el preview público (H5) y CTA a login/registro; al autenticarse queda unido

### H5 Público

- **Given** token válido  
- **When** alguien sin sesión abre el link  
- **Then** ve nombres + quién debe + gastos del grupo; no ve cuentas ni “$ de mi banco”

- **Given** token inválido  
- **Then** estado de error simple, sin filtrar existencia de otros grupos

### H6 Split en el form

- **Given** grupo Casa con Ana (yo) + Juan (ghost); yo cargo expense 10_000 (centavos) en mi cuenta  
- **When** toggle on, grupo Casa, default iguales  
- **Then** se crea el expense en **mi** ledger **y** el split; preview 5_000 c/u; Juan me debe 5_000; mi saldo de cuenta baja 10_000

- **Given** toggle on y ningún grupo  
- **Then** no se puede confirmar el split; hay camino a crear grupo

- **Given** income o transfer  
- **Then** no hay toggle de dividir

### H7 Detail

- **Given** splits y (si v1) settlements  
- **When** abro el grupo  
- **Then** nets coherentes con SPEC-10; actividad muestra quién registró / quién pagó

- **Given** dos splits 6000 «Comida» y 4000 «Transporte», más un settlement 1000  
- **When** abro el grupo y la tab «Gastos por categoría»  
- **Then** el donut suma 10_000 (el settlement no entra); Comida 60 % y Transporte 40 %; la tab «Movimientos» sigue listando gastos **y** cobros

- **Given** un split sin categoría  
- **When** abro «Gastos por categoría»  
- **Then** entra en el bucket «Sin categoría» (mismo id sintético que SPEC-11)

- **Given** visitante del link público  
- **When** abre `/s/{token}`  
- **Then** no ve categorías ni el donut (FR-05)

### H8 Sin tenant grupal

- **Given** usuario con solo personal (post-migración)  
- **When** usa la app  
- **Then** no hay `CreateGroupWorkspace`, no hay switcher de espacios, no hay `/invitaciones` de tenant group, dashboard sin `memberBalances` de workspace group

### H10 Settlement (si entra)

- **Given** Juan debe 5_000 a Ana  
- **When** Ana registra settlement Juan→Ana 5_000  
- **Then** net Ana-Juan = 0

## 9. Modelo de dominio propuesto

Lenguaje ubicuo. Invariantes de centavos, errores tipados, frontera domain/service, escenarios TDD (T-01…T-20) y propuesta Prisma: **[SPEC-10](./10-expense-splitting.md)**. Tenancy: [ADR-007](../adr/007-split-group-tenancy.md).

```text
User ── Membership ──► Workspace (siempre personal en producto)
                         ├── Account, Category, Transaction, Budget, Goal, …
                         └── SplitGroup[]          (dueño de datos = este tenant)
                                ├── SplitGroupMember[]   (user | ghost)
                                ├── SplitExpense[]       (SPEC-10)
                                │      └── shares[]      (por memberId)
                                └── Settlement[]         (por memberId)
```

### SplitGroup

| Campo | Notas |
|-------|--------|
| id | |
| workspaceId | Tenant del **creador**. No se switch-ea. |
| name | Visible; el único dato de producto del círculo |
| currency | = baseCurrency al crear (v1) |
| publicShareToken | URL-safe, unguessable |
| createdByUserId | |

### SplitGroupMember

| Campo | Notas |
|-------|--------|
| id | **Esta** es la identidad en shares/balances (no `User.id`) |
| splitGroupId | |
| kind | `user` \| `ghost` |
| userId | required si `user`; null si `ghost` |
| displayName | ghosts: el nombre cargado; users: snapshot o displayName vivo |

Invariantes de producto (cerradas en SPEC-10 / domain-model):

- Creador queda como miembro `user` al crear.
- Ghost: sin `userId`; no inicia sesión; igual entra en `allocate*`.
- User-miembro: `userId` único por grupo.
- Un User no necesita `Membership` en el workspace de Ana para ver el grupo.

### SplitExpense (evolución de `ExpenseSplit`)

| Campo | Notas |
|-------|--------|
| splitGroupId | círculo |
| expenseTransactionId | v1: required (payer = registrador; tx en **su** workspace) |
| paidByMemberId | v1: miembro user del registrador |
| method | `equal` (default) \| `exact` \| `percentage` |
| shares | `Σ shareCents = amount` (SPEC-10) |

La tx vive en el workspace del que pagó. El split vive anclado al `SplitGroup` (tenant del creador). El cruce de tenants es un FK de IOU → tx (SPEC-10 T-09 / ADR-007). Producto: *cada uno lleva su gasto en su ledger; el grupo solo guarda el IOU*.

### Settlement

Igual espíritu SPEC-10, claves = `memberId` (ghost o user), no `userId` de workspace group.

### Qué no es

- `SplitGroup` ≠ `Workspace`.
- Ghost ≠ User. No hay User “fake”.
- El link público ≠ sesión. Es una proyección.

Reglas de dinero (normativas, ya existentes; adaptar a `memberId`):

- Equal / remainder: [SPEC-10 § algoritmo equal](./10-expense-splitting.md).
- Orden estable: por `memberId` (reemplaza orden por `userId`).

## 10. Kill list (código / producto a matar)

No dejar shims ni flags del modelo viejo.

| Superficie | Qué muere |
|------------|-----------|
| SPEC-02 group ABM | `CreateGroupWorkspace`, leave/delete group tenant, rename **como grupo-tenant**, transfer ownership de group WS, `InviteMember` de workspace, `AcceptInvitation` de tenant, auto-accept de invites de grupo al `RegisterUser` |
| UI | `workspace-switcher` (si queda 1 personal: ocultar/eliminar), `NewGroupWorkspaceForm`, `InviteMemberForm` de WS, `MembersManagement` de WS group, `DeleteGroupDialog` / `LeaveGroupButton` de tenant, `/groups/settings` como admin de workspace, `/invitaciones/[token]` de **tenant** |
| Splits actuales | Gate `assertGroupWorkspace` / `NotAGroupWorkspaceError`; shares por `userId` de membership de group WS; overview de patrimonio Σ cuentas del group WS |
| SPEC-14 | `CrossWorkspaceLink`, aporte Personal→Casa, selector de cuenta foreign, labels “Espacio personal de X”, gates `WorkspaceHasCrossLinks` / `AccountHasCrossWorkspaceLinks`: **drop total** (no queda segundo tenant; ADR-007). |
| Dashboard SPEC-12 | `memberBalances` de workspace group; CTA “Ver grupo” hacia tenant |
| Onboarding SPEC-15 | Trigger post-`CreateGroupWorkspace`; copy “al crear un grupal” |
| Nav | `/groups` se **queda** pero significa SplitGroups, no el tenant |
| Prisma | Borrar rows `Workspace.type=group` (el label del enum queda unused hasta follow-up), drop `Invitation`, drop `CrossWorkspaceLink`, reemplazar `ExpenseSplit`/`Settlement` por el schema SPEC-10 §12 (ancla `splitGroupId` + `memberId`). |
| Guía | [workspaces-and-invites.md](../guides/workspaces-and-invites.md) se reescribe: invites pasan a SplitGroup |

**No matar:** workspace personal, `getActiveWorkspaceForUser` (siempre el personal), membership owner del personal, onboarding de **cuentas** del personal (SPEC-15), auth Better Auth.

## 11. Relación con otras specs

| Spec | Cambio |
|------|--------|
| **SPEC-02** | Producto de group workspace **retirado**. Queda: 1 personal inborrable, listado interno, cookie activa trivial. ABM group (FR-02…FR-13) → fuera de producto. |
| **SPEC-10** | Sigue siendo el motor de shares/settlements. Cambia el sujeto: miembros de `SplitGroup` (ghost + user), no members de workspace group. |
| **SPEC-14** | **Retirada / no-goal de KRI-29.** El motivo (fondear Casa / pagar Casa con Visa personal) desaparece al no haber tenant Casa. No reimplementar twins. |
| **SPEC-05** | El form de alta de expense gana el toggle; delete con split sigue en cascada. Se **quita** alcance de listado cross-WS y cuentas foreign. |
| **SPEC-12** | Sin bloques de balances de workspace group. Opcional later: chip “tenés deuda en grupos” → `/groups`. |
| **SPEC-13** | Detalle de tx muestra split del `SplitGroup` (nombres de miembros). Sin bloque cross-WS. |
| **SPEC-15** | Solo first-run de **personal**. |
| **SPEC-01** | Quitar auto-accept de invitaciones de **workspace group**. Un invite de SplitGroup es otro token. |
| **SPEC-03 / 06 / 07 / 08 / 16 / 18 / 20** | Quitar menciones operativas a group WS / SPEC-14 donde bloqueen delete o listados. SPEC-20: link público dinámico, no SW de saldos. |
| **Visión** | Principio “hogar primero”: el hogar es **círculo de splits de primera clase**, no un segundo tenant. |
| **ADR-002 / ADR-007** | Enmienda aceptada: Workspace personal + SplitGroup; authz por miembro. |

## 12. Orden de implementación

Flujo de repo: spec (este doc + SPEC-10) → TDD dominio → services → actions → UI. Git Flow: rama `feat/…` desde `develop`.

| Paso | Quién | Qué |
|------|-------|-----|
| 0 | PM (hecho) | Este brief / spec. Linear KRI-29 = fuente de intención. |
| 1 | `business-logic-architect` | **Hecho.** [ADR-007](../adr/007-split-group-tenancy.md) + SPEC-10 dominio cerrado (invariantes, errores, T-01…T-20, Prisma). |
| 2 | `software-engineer` | **Kill + migración** group WS y SPEC-14 (tests viejos de `NotAGroupWorkspace` / contribution se eliminan o se reemplazan). Usuario queda solo con personal. Cero código muerto. |
| 3 | SE + TDD | Domain SplitGroup: create, add ghost, invite/join, balances con `memberId`. Tests primero. |
| 4 | SE | Prisma + services + actions (`getSession`, Zod, authz: owner del grupo **o** user-miembro; público = token). |
| 5 | `ui-ux-developer` + SE | `/groups` empty + create + add member + detail. Mobile-first, una mano. |
| 6 | UI + SE | Form de gasto: toggle, selector, preview, exact opcional. |
| 7 | SE + UI | Página pública `/s/[token]` (o similar), `noindex`, copy WhatsApp. |
| 8 | SE | Settlements si entran; reclamo de ghost si entra. |
| 9 | SE | Dashboard/detalle/nav/guías; `npm test` verde; smoke del happy path. |

No UI de splits sin tests de dominio verdes. No reintroducir switcher “por las dudas”.

## 13. Comandos y consultas (borrador de producto)

Nombres en inglés para código. Contratos de dominio y Prisma: SPEC-10 §9 y §12.

| Tipo | Nombre | Notas |
|------|--------|-------|
| Command | `CreateSplitGroup` | name |
| Command | `RenameSplitGroup` | creador |
| Command | `DeleteSplitGroup` | creador; cascade círculo; txs de ledger quedan |
| Command | `AddGhostMember` | displayName |
| Command | `RenameSplitGroupMember` | ghost: cualquier user-miembro; user: uno mismo o el creador |
| Command | `RemoveSplitGroupMember` | sin historial; no el creador |
| Command | `CreateSplitGroupInvite` | link “Tiene Plata” |
| Command | `JoinSplitGroup` | token + session |
| Command | `CreateExpenseWithSplit` | SPEC-05 + groupId; equal default |
| Command | `CreateSettlement` | si H10 |
| Query | `ListMySplitGroups` | creador o user-miembro |
| Query | `GetSplitGroup` | authz miembro user; 404/Forbidden para no-miembros |
| Query | `GetPublicSplitGroup` | por token; proyección FR-05 |
| Query | `GetSplitGroupBalances` | SPEC-10 |

## 14. Fuera de alcance / no-goals

- No reconstruir el hogar como banco compartido.
- No “workspace grupal desactivado pero el código sigue”.
- No tenancy nueva (Organization de Better Auth) para grupos.
- No exigir que el compañero se registre.
- No mostrar patrimonio del grupo.
- No cargar el gasto **desde** la sección grupos en v1 (solo nota + deep link al form `?new=expense&splitGroup=…` si ayuda al CTA).

## 15. Riesgos

| Riesgo | Mitigación de producto |
|--------|------------------------|
| ADR-002 / authz “todo es membership de workspace” | Cerrado en ADR-007: acceso por `SplitGroupMember`; ledger sigue por membership del **propio** personal |
| FK split (tenant Ana) → tx (tenant Bob) | v1 puede **limitar** a “solo el creador registra gastos” si el cruce es demasiado; **preferencia: cualquier user-miembro registra en su ledger**. Si se corta: Must = solo owner paga, Should = los demás. Decisión por defecto: **cualquier user-miembro paga desde su form** |
| Link público filtra montos | Token largo; `noindex`; sin PII más que nombres elegidos; rotar token = later |
| Usuarios con group WS en prod | Breaking; comunicar; hard-delete. Si hubiera datos reales, backup fuera de este epic |
| Empty “cargás lo que puso cada uno” vs “solo yo pagué” | Copy del empty es la visión; v1 cubre “yo pagué y lo repartí”. H13 later |
| SPEC-14 tests/UI huérfanos | Paso 2 del orden: matar con los tests |

## 16. Preguntas cerradas en este brief (no bloquean)

1. **¿Se elimina el tenant?** No: se elimina el **tipo group**, no el Workspace.  
2. **¿Ghosts?** Sí, P0.  
3. **¿Vista pública sin app?** Sí, P0, solo lectura.  
4. **¿SPEC-14?** Se retira con este epic.  
5. **¿Payer ≠ yo?** Later (H13).

## 17. Hand-off

- → **`software-engineer`:** SPEC-10 + ADR-007 cerrados. Kill list → TDD dominio T-01…T-20 → Prisma §12 → services/actions → UI. Tras domain verde. Testear el flujo completo (no dejar dead code).
- → **`ui-ux-developer`:** empty H1, sheet “Un grupo nuevo”, add member (dos caminos), form de gasto (toggle + preview + custom), detail de grupo, página pública. Mobile-first. No tokens/hex. Preview usa cents de `previewEqualSplit` (no otra regla).

## 18. Dependencias de docs a actualizar en el mismo epic (ingeniería)

Además de esta spec, SPEC-10 y ADR-007 (hechos en el diseño de dominio): `glossary.md`, `roadmap.md`, `vision.md` (principio hogar), `guides/workspaces-and-invites.md`, banners en SPEC-02 y SPEC-14, menciones SPEC-05/12/13/15 — el SE las alinea al matar código.
