# KRI-35 — Análisis: moneda default, timezone y tab Cuenta

| Campo | Valor |
|-------|-------|
| Issue | [KRI-35](https://linear.app/finance-hub/issue/KRI-35) |
| Tipo | Análisis (sin cambio de producto en este PR) |
| Fecha | 2026-08-27 |

## 1. Decisión recomendada (tl;dr)

**No hay que rediseñar el sistema de monedas.** El ledger ya es multi-moneda ARS|USD por cuenta ([ADR-006](../adr/006-multi-currency-ars-usd.md)). El bug de producto es otro: Ajustes expone controles que **guardan un campo** o **parecen de dinero** y no mueven el ledger.

| Pregunta del ticket | Respuesta |
|---------------------|-----------|
| ¿Rediseñar todo para que cambiar la moneda default funcione? | **No.** Convertir historial, presupuestos, grupos y patrimonio al vuelo es un producto distinto (y peligroso). |
| ¿Elegirla al configurar la cuenta y no poder cambiarla más? | **Sí, para `Workspace.baseCurrency`.** Hoy ya nace en el alta (default `ARS`) y el onboarding la muestra read-only. Tratarla como freeze. Para cualquier país: elegirla **en onboarding** (§9). |
| ¿Agregar más monedas de uso según la cuenta? | **Ya existe para ARS y USD.** Cada `FinanceAccount` tiene su `currency` inmutable. El perfil con EUR/BRL es un señuelo. Internacional = whitelist en onboarding + cuentas `base` o USD (§9), no N-FX. |

Acciones de producto (follow-up de implementación, no este análisis):

1. **Quitar de Ajustes → Perfil** el selector “Moneda preferida” y el campo “Zona horaria”.
2. **Eliminar el tab Cuenta entero** (rename + tasa de consolidación) y el código que solo sirve a esa UI.
3. Dejar el modelo: `User.preferredCurrency` / `User.timezone` / `Workspace.baseCurrency` en DB con defaults Argentina; no hace falta migración destructiva.
4. Si el producto quiere “cualquier país”: **elegir `baseCurrency` (y timezone) una vez en onboarding y freeze** — ver §9. No es un rediseño del ledger.

---

## 2. Hay tres “monedas”, no una

El usuario en Ajustes ve **“Moneda preferida”** y lo lee como “moneda de la cuenta”. En el modelo son tres conceptos distintos:

```text
User.preferredCurrency          Workspace.baseCurrency           Account.currency
perfil (Ajustes → Perfil)       consolidación + defaults         ledger nativo
ARS|USD|EUR|BRL|CLP|UYU         pensado ARS|USD (ADR-006)        solo ARS|USD
se guarda y casi no se lee      sí se usa en dinero              inmutable post-alta
```

### 2.1 `User.preferredCurrency` — el control que “no hace nada”

- UI: Ajustes → Perfil → `UpdateProfileForm`.
- Persistencia: `updateProfile` escribe `user.preferredCurrency` y solo `revalidatePath("/settings")`.
- Lectura de producto **después del alta:** ninguna pantalla de dinero lo consulta.
- Único consumidor: fallback al **crear** un workspace personal si el usuario no tiene membership (`getActiveWorkspaceForUser` → `createPersonalWorkspaceForUser({ baseCurrency: user.preferredCurrency ?? "ARS" })`).
- El alta normal ya crea el workspace en el hook `user.create.after` con default `ARS`. Cambiar el perfil **después** no toca el workspace existente.

El selector además lista **EUR, BRL, CLP, UYU** (`SUPPORTED_CURRENCIES` en `src/features/auth/domain/profile.ts`). El ledger operativo es `ACCOUNT_CURRENCIES = ARS | USD` (`src/domain/money/currencies.ts`). Elegir EUR en Perfil no habilita cuentas en euros.

### 2.2 `Workspace.baseCurrency` — la moneda que sí importa

Usada como:

- default al crear cuenta, presupuesto, objetivo y formulario de movimiento;
- moneda de consolidación del patrimonio (`≈` en el panel, SPEC-12 FR-06);
- freeze de `SplitGroup.currency` al crear el grupo.

**No hay UI en Ajustes para cambiarla.** `updateWorkspaceIdentityAction` existe (onboarding / identidad) y **ningún componente la llama**. El wizard de onboarding muestra `baseCurrency` como texto read-only (SPEC-15 FR-02).

ADR-006: cambiar `baseCurrency` se bloquea si hay cuentas con moneda distinta al valor nuevo. En la práctica, con la primera cuenta ARS (el caso default) **ya no se puede pasar a USD**; con mix ARS+USD tampoco. Queda freeze de facto.

Cambiar `baseCurrency` **no reconvertiría** movimientos históricos: cada tx vive en la moneda de su cuenta. Solo cambiaría defaults futuros y la unidad del `≈` consolidado. Por eso no vale la pena un flujo de “cambiar moneda de la cuenta” en Ajustes.

### 2.3 `Account.currency` — “más monedas según la cuenta”

Ya es el modelo correcto:

- se elige al **crear** la cuenta (ARS o USD);
- es **inmutable** después (SPEC-03);
- puede diferir de `baseCurrency`;
- tarjeta ARS+USD = dos accounts (KRI-11);
- canje explícito ARS↔USD (SPEC-16), no FX mágico en transferencias.

No hace falta un rediseño ni abrir EUR/BRL en v1 (fuera de alcance explícito de ADR-006).

---

## 3. Timezone: no es un no-op, pero en la UI parece uno

`User.timezone` **sí se usa** en dominio:

| Superficie | Efecto |
|------------|--------|
| Panel / analytics | “Este mes” = mes calendario en esa IANA (`getCurrentMonthPeriod`) |
| Listado de movimientos | presets `this_month` / `this_week` |
| Recurrentes | “hoy”, vencida, horizonte |
| Alta de tx / canje / aporte | tope `occurredOn` ≤ hoy+1 (clock skew) |

Por qué el usuario no ve nada:

1. Default y realidad de producto: `America/Argentina/Buenos_Aires`. Cambiar a otra zona del mismo offset (Córdoba, Montevideo) no cambia el calendario.
2. El efecto solo aparece en **bordes de día/mes** (p. ej. 23:00 ART vs UTC). A media tarde los números y el mes son iguales.
3. El control es un **input de texto IANA** (“Formato IANA…”), no un selector. Mala UX; fácil pensar que “no sirve”.
4. SPEC-15: el onboarding **no pide** timezone (a propósito).

Para un MVP argentino, exponer timezone en Ajustes no paga. El campo en DB se queda con el default BA. Si más adelante hay usuarios en España/México, el dominio ya está listo: solo haría falta un selector (no un text field) y `revalidate` de rutas de dinero al cambiarlo.

`updateProfile` hoy no revalida `/dashboard` ni `/transactions`. Con `staleTimes.dynamic: 0` la próxima navegación debería leer fresco; igual es un detalle a corregir **si** se deja el campo.

---

## 4. Ajustes → Cuenta: leftover, no un tab de producto

Post KRI-29 hay un solo ledger personal. El tab “Cuenta” (`?tab=workspace`) tiene dos cards. Las dos sobran en Ajustes.

### 4.1 Tasa de consolidación — quitarla de acá

La tasa **sí sirve** en el panel: si hay saldos ARS y USD, el patrimonio `≈` usa `WorkspaceConsolidationRate` (SPEC-12 / SPEC-19). El feed DolarApi **no** pisa el TC solo; el usuario aplica MEP.

Hoy hay **dos UIs**:

| Dónde | Qué hace |
|-------|----------|
| Sidebar → card Dólar | Lectura Oficial/MEP, convertidor, **“Usar MEP de hoy”** (escribe la misma tasa) |
| Ajustes → Cuenta | Formulario **manual** (ARS por USD + label + fecha) + otra vez “Usar MEP” |

`ConsolidationRateForm` **solo se monta en Ajustes**. El camino que usa el usuario es el sidebar. La card de Ajustes es duplicado + la única vía para un TC inventado a mano.

Recomendación: **sacar la card de Ajustes.** Conservar:

- tabla / servicio `upsertConsolidationRate` + `applyMepConsolidationRate`;
- CTA del sidebar;
- caption del panel.

Si más adelante hace falta un TC manual (sin MEP), el lugar es el panel (junto al `≈`), no Ajustes. Fuera del follow-up de limpieza.

### 4.2 Rename del espacio — tampoco se ve

`RenameWorkspaceForm` persiste `Workspace.name`. El chrome ya **no** muestra ese nombre: el switcher (KRI-29) renderiza `displayName` del user y el subtítulo “Tu cuenta”.

El nombre del workspace sí aparece en **descripciones** de páginas (`Panel · {name} · agosto 2026`, listados, onboarding). Cambiarlo no cambia identidad percibida en el sidebar. Es leftover de tenant grupal.

Recomendación: **sacar rename de Ajustes.** Dejar `Workspace.name` autogenerado (`"{nombre} — Personal"`). Si duele, se puede alinear al `displayName` en el mismo `UpdateProfile`; no hace falta un tab entero.

### 4.3 Consecuencia de vaciar el tab

Sin esas dos cards el tab Cuenta queda vacío → **eliminar el tab**. Quedan Perfil (nombre) y Categorías.

---

## 5. Inventario de código a retirar (follow-up)

Solo lo que deja de tener consumidor de producto. No borrar el dominio de consolidación ni timezone en servicios de periodos.

### UI / rutas

| Pieza | Acción |
|-------|--------|
| Tab `workspace` en `settings-tabs-nav.tsx` | Eliminar |
| Card consolidación + `ConsolidationRateSection` en `settings/page.tsx` | Eliminar |
| `RenameWorkspaceForm` | Eliminar componente + usos |
| Campos `preferredCurrency` y `timezone` en `UpdateProfileForm` | Eliminar |
| `ConsolidationRateForm` | Eliminar **si** no se reubica en el panel; si se reubica, mover, no copiar |

### Actions / services huérfanos de UI

| Pieza | Acción |
|-------|--------|
| `renameWorkspaceAction` + `rename-workspace` service/schema | Eliminar con la UI |
| `updateWorkspaceIdentityAction` + service/schema | Eliminar: **cero callers** en `src/` |
| `UpdateProfile` timezone/currency | Dejar de aceptar en el schema de Ajustes; el User row puede conservar defaults |

### Qué **no** borrar

- `User.timezone` y su uso en dashboard / txs / recurrentes.
- `User.preferredCurrency` como default de seed (o fijar `ARS` en `createPersonalWorkspaceForUser` y dejar de leer el perfil).
- `Workspace.baseCurrency` y `ACCOUNT_CURRENCIES`.
- `WorkspaceConsolidationRate`, `upsertConsolidationRate`, apply MEP, card Dólar del sidebar.
- Tests de dominio de periodos y consolidación.

La guía [workspaces-and-invites.md](../guides/workspaces-and-invites.md) § Ajustes todavía documenta “Renombrar + tasa” y un onboarding “nombrar y elegir moneda” que **no** coincide con SPEC-15 ni con el wizard actual. Actualizarla en el mismo follow-up.

---

## 6. Specs a enmendar en el follow-up

| Spec | Cambio |
|------|--------|
| SPEC-01 | Historia 4 / FR-05: perfil = `displayName` (y email read-only). `preferredCurrency` / `timezone` dejan de ser editables en MVP. T-05 se reduce o se mueve a “defaults de alta”. |
| SPEC-02 | Kill list: rename de espacio en Ajustes (ya no hay tenant grupal que lo justifique). |
| SPEC-15 | Confirmar freeze de `baseCurrency` en intro (ya FR-02 read-only). Opcional P2: elegir ARS\|USD **una vez** en onboarding **antes** de la primera cuenta. |
| SPEC-12 / SPEC-19 | TC de consolidación se edita desde sidebar (apply MEP), no desde Ajustes. |
| Guía workspaces | Alinear copy de Ajustes y onboarding a la realidad. |

No hace falta un ADR nuevo: ADR-006 sigue vigente. Este documento es la decisión de **superficie** (qué se muestra), no de ledger.

---

## 7. Fuera de alcance (no hacer)

- Feeds que reconviertan el historial al cambiar “moneda default”.
- Cuentas en **cualquier** ISO 4217 sin whitelist (N monedas × N tasas).
- Time-travel de patrimonio / historial de TC (ya fuera de SPEC-16/19).
- Unificar `preferredCurrency` con `baseCurrency` vía sync en cada `UpdateProfile` (escondería el freeze y rompería expectativas: “cambié a USD y mis cuentas ARS siguen en pesos”).
- Cotizaciones DolarApi / MEP para un usuario cuyo `baseCurrency` no es ARS.

Pedir timezone + moneda en onboarding **deja de estar fuera de alcance** si se adopta §9 (hoy SPEC-15 lo excluye a propósito para el MVP AR).

---

## 8. Follow-up sugerido

Un issue de implementación, p. ej. **`fix: limpiar Ajustes (KRI-35)`**, con este alcance:

1. Specs 01 / 02 / 15 / guía workspaces según §6.
2. Quitar tab Cuenta + form de consolidación en Ajustes + rename.
3. Quitar moneda y timezone del form de perfil; Perfil = nombre (+ email disabled).
4. Borrar actions/services/schemas sin caller.
5. No tocar ledger, canje, cotizaciones ni cálculo de periodos.

Criterio de listo: Ajustes no promete nada que el ledger no cumpla; el TC sigue aplicándose con “Usar MEP de hoy”; crear cuenta ARS o USD sigue igual.

Un segundo issue, p. ej. **`feat: moneda de espacio en onboarding (freeze)`**, cubre §9 (whitelist, wizard, invariante de dominio, ADR-006 enmienda). No mezclarlo con la limpieza de Ajustes.

---

## 9. ¿Y si la app es multi-moneda, se elige en onboarding y no se puede cambiar? (cualquier país)

Sí: **ese es el modelo correcto** para internacionalizar. No hace falta un motor FX tipo Wise. El `Money` VO ya acepta cualquier ISO 4217 de 3 letras; el techo hoy es de **producto** (`ACCOUNT_CURRENCIES = ARS|USD`, consolidación y DolarApi pensados ARS↔USD).

Hay que no confundir tres productos:

| Modelo | Qué es | ¿Lo queremos? |
|--------|--------|----------------|
| **A. Mono-moneda internacional** | Onboarding elige MXN/EUR/BRL/…; todas las cuentas en esa moneda; sin dólares | Sirve para España/México *hasta* que el usuario tenga USD. **Rompe el caso Argentina** (hogar bimonetario). |
| **B. Base freeze + segunda moneda USD** | Onboarding elige la moneda *local* del espacio; freeze para siempre; las cuentas pueden ser `baseCurrency` **o** USD | **Recomendado.** Un mexicano opera en MXN (+ USD si quiere). Un argentino en ARS + USD como hoy. |
| **C. Multi-FX abierto** | Cualquier cuenta en cualquier ISO, N tasas, N feeds | Rediseño. No para este horizonte. |

### 9.1 Qué se congela (y cuándo)

Congelar **`Workspace.baseCurrency`**, no “la moneda de cada banco”:

1. Onboarding, **antes de la primera cuenta**: selector de moneda local (whitelist ISO, no el enum inflado del perfil).
2. Al confirmar, `updateWorkspaceIdentity({ baseCurrency })` — hoy existe y **no tiene callers**.
3. Invariante de dominio: una vez hay ≥1 cuenta (o `CompleteWorkspaceSetup`), `baseCurrency` es **inmutable**. Rechazar cualquier patch posterior (`CannotChangeBaseCurrency`).
4. Ajustes **no** muestra el control. Como mucho, un dato read-only (“Moneda del espacio: BRL”).
5. Timezone en el mismo paso (país → IANA). Mismo freeze. El text field de Perfil sigue de más.

`Account.currency` sigue eligiéndose **al crear cada cuenta**, inmutable después (SPEC-03). No es la misma palanca.

### 9.2 Whitelist (no “el mundo”)

Abrir de a un set que Intl sepa formatear. Ejemplo v1 internacional:

`ARS, USD, EUR, BRL, MXN, CLP, UYU, COP, PEN, GBP`

Regla de cuentas: `currency ∈ { baseCurrency, USD }` (si la base ya es USD, solo USD — o permitir EUR como segunda más adelante, no ahora).

Canje (SPEC-16): el agregado ya es “dos montos explícitos”. Generalizar la guarda “solo ARS↔USD” a “base ↔ USD”. Sin feed: el usuario tipea ambos montos. DolarApi / “Usar MEP” **solo** si `baseCurrency === "ARS"`.

Consolidación: el schema ya tiene `quoteCurrency`. Hoy el dominio todavía corta en ARS↔USD (`UnsupportedConversionError`). Generalizar a `baseCurrency ↔ USD` con tasa manual; el sidebar de cotizaciones AR es un extra, no un requisito para Brasil/México.

Formato: `formatMoney` ya pasa el ISO a `Intl`; el locale default `es-AR` puede quedar (muestra el código `MXN` / `EUR`). Locale por país es polish, no bloquea.

### 9.3 Qué no cambia del ledger

- Centavos enteros (ADR-001).
- Nada de sumar monedas crudas.
- Transfer same-currency; canje explícito si hay dos monedas.
- Splits: moneda del grupo = freeze de `baseCurrency` al crear (como ahora).
- No reconversión de historial. Por eso el freeze: cambiar la base después no tiene un significado honesto.

### 9.4 Costo real vs rediseño

No es rediseñar el sistema. Es:

- enmendar ADR-006 / SPEC-03 / SPEC-15 / SPEC-16 (whitelist + freeze + canje base↔USD);
- usar el action de identidad en el wizard;
- invariante `CannotChangeBaseCurrency` con test TDD;
- soltar el corte hardcodeado ARS↔USD en consolidación cuando la base no es ARS;
- **no** construir feeds por país.

Usuarios ya existentes: `baseCurrency = ARS` implícito; el freeze ya se cumple. No hay migración de montos.
