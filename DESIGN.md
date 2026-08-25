# Finance Hub — Design System

> Referencia visual: prototipo Figma Make ([ledger navy](https://snail-alter-01697042.figma.site/)).  
> Stack UI: **shadcn/ui** (Radix) + Tailwind CSS v4 + tokens semánticos en `src/app/globals.css`.  
> Fuente de verdad de producto: `docs/`. Este archivo es la fuente de verdad de **UI/UX**.

---

## 1. Intent

| Pregunta | Respuesta |
|----------|-----------|
| **Quién** | Persona o pareja que abre la app entre tareas del día para registrar un gasto, mirar saldos o revisar el presupuesto. |
| **Qué debe lograr** | Entender el estado del dinero en segundos y actuar (registrar, transferir, ajustar presupuesto). |
| **Cómo debe sentirse** | Preciso y calmado, con un escritorio financiero de **navy + slate**: rail oscuro a la izquierda, papel slate claro, color solo donde comunica (azul de acción, verde ingreso, rosa egreso). |

**Dominio (metáforas):** ledger, saldos, flujo de caja, presupuestos, objetivos, splits compartidos.  
**Mundo de color:** navy (`#0f1629`) del rail, papel slate-50, cards blancas, azul CTA, emerald ingreso, rose egreso, indigo transferencia.  
**Firma:** sidebar **siempre navy** (también en tema claro) + canvas slate con **cards blancas independientes** (no un panel único envolvente) + CTA en degradé azul.  
**Defaults que rechazamos:** sidebar clara tipo Dub, canvas achromático / cream+serif, purple-indigo SaaS, CTA ink/negro, un único content-panel con radio que envuelve toda la página, Geist como UI face, hex sueltos en componentes.

---

## 2. Principios

1. **Tokens primero.** Todo color pasa por variables CSS semánticas. Cero hex / `zinc-*` / `slate-*` / `blue-*` en UI de producto.
2. **Variantes, no overrides.** Estilos repetidos viven en CVA (`variant` / `size`) del componente shadcn o de un wrapper de producto.
3. **Azul = acción.** El degradé `bg-cta` (y el token `primary` / `info`) comunica CTA, foco y nav activa. No usar tinta negra como botón primario.
4. **Jerarquía por peso, color y familia.** Títulos en Nunito extrabold; labels muted + tracking-widest; montos con `.tabular` (Nunito + `tabular-nums`).
5. **Profundidad quieta.** Cards: borde hairline slate + `shadow-card`. Sin drop-shadows dramáticos.
6. **shadcn antes que inventar.** Buscar en `src/components/ui/*` antes de crear un control nuevo.
7. **La UI no contiene reglas de negocio.** Solo presenta datos ya resueltos por domain/application.
8. **Mobile-first.** El layout base es el teléfono. `sm:` / `md:` / `lg:` solo enriquecen.

---

## 3. App shell (layout firma)

Rail navy flush a la izquierda (`Sidebar` `variant="sidebar"`) — **no** inset flotante, **no** rail de iconos aparte.

```
┌──────────────┬─────────────────────────────────────────────┐
│ Sidebar navy │  (md+) trigger de colapso                   │
│ 220px        ├─────────────────────────────────────────────┤
│ · workspace  │  Canvas slate                                │
│ · CTA azul   │  H1 Nunito + subtítulo + acciones            │
│ · nav        │  Cards blancas (patrimonio, KPIs, listas…)  │
│ · grupos     │  max-w 1400px, padding 16/24/32              │
│ · dólar      │                                              │
│ · user       │                                              │
└──────────────┴─────────────────────────────────────────────┘
```

| Zona | Token / clase | Notas |
|------|---------------|--------|
| Sidebar | `bg-sidebar` (`--sidebar`) | Navy **en claro y oscuro**. Ancho 220px (`13.75rem`) |
| Workspace | avatar `bg-sidebar-primary` + nombre `text-sidebar-primary-foreground` | Arriba del todo |
| CTA rápida | `Button` `bg-cta` rounded-xl h-10 font-bold | “Registrar” / “+ Nueva transacción” |
| Item nav idle | `SidebarMenuButton` h-11 rounded-xl | `text-sidebar-foreground`. Icono = emoji colorido (`NavGlyph`, prototipo Figma); el label nombra el destino |
| Item nav active | `data-active` → `bg-sidebar-accent` + `text-sidebar-accent-foreground` | Azul translúcido, no gris. El glifo no hereda color (sigue colorido) |
| Grupos | `SidebarGroupLabel` | Uppercase, tracking-widest, 10px (PLANIFICACIÓN, COMPARTIDO) |
| Cotización | `UsdQuotesCard` | Tokens `sidebar-*` (vive sobre navy) |
| Tema | `ThemeToggle` en footer | Claro / Oscuro / Sistema |
| Canvas | `bg-background` | Slate-50 en claro; navy night en oscuro |
| Cards | `SurfaceSection` / `bg-card` | `rounded-2xl` + `shadow-card`. `min-w-0 max-w-full`. No `overflow-hidden` salvo `flush` (cliparía la sombra). |

**ContentPanel** ya **no** es un card envolvente. Es chrome de página (H1 + description + actions) sobre el canvas. Cada bloque de contenido es una card propia.

**Mobile:** navegación primaria = **tab bar docked** (borde superior, `bg-card/95`, blur) anclado abajo con `safe-area-inset-bottom`. Sin header sticky de título. El hamburger/`SidebarTrigger` queda para `md+`.

#### 3.1.1 Mobile tab bar

| Slot | Destino | Notas |
|------|---------|--------|
| Panel | `/dashboard` | Home |
| Transacciones | `/transactions` | Actividad diaria |
| **+ Registrar** | acción (no ruta) | Abre `NewTransactionSheet`; CTA `bg-cta` rounded-xl |
| Presupuestos | `/budgets` | Planificación; badge at-risk si aplica |
| Más | sheet bottom | Cuentas, Objetivos, Grupos, Recurrentes, Ajustes, workspace, tema, salir |

**Craft:** barra full-width, no pill flotante. Cada tab muestra **icono + label debajo** (activo = `bg-info-muted` + `text-info-muted-foreground`). Clearance: `pb-[calc(4.75rem+env(safe-area-inset-bottom))]`.

**Montaje (obligatorio):** `MobileTabBar` y `NewTransactionSheet` viven **fuera** del flex de `SidebarProvider`. Si la `<nav>` es hermana flex de `SidebarInset`, ensancha la página, aparece scroll lateral y la barra sale del viewport. Contrato: `position: fixed; left: 0; bottom: 0; width: 100%; max-width: 100%; z-50`. No usar `100vw` / `100dvw` (incluyen el gutter del scrollbar).

**Desktop (`md+`):** sidebar navy intacto; tab bar `md:hidden`.

### 3.2 Create flows — FormSheet (no forms en la lista)

Los formularios de carga (movimientos, cuentas, presupuestos, objetivos) **no viven en la página de lista**. Se abren en un **FormSheet**.

| Viewport | Comportamiento |
|----------|----------------|
| Móvil | **Bottom sheet** (~92dvh, esquinas superiores redondeadas). El teclado **empuja** el sheet (`interactive-widget: resizes-content` + `visualViewport`) y el cuerpo scrollea para que el campo con foco no quede tapado. |
| `md+` | Drawer fijo a la **derecha** (`sm:max-w-md` / `lg` para movimientos) — la lista queda visible detrás |

**Cerrar:** botón X en el header del sheet — `outline`, `rounded-full`, target táctil ≥40px en móvil (`size-10`). Neutro; no usar `destructive` (reservado a egresos y acciones destructivas).

**Por qué no modal centrado en desktop:** los forms tienen muchos campos y secciones condicionales (splits, categorías). El sheet escala mejor mobile (bottom) → desktop (drawer).

### 3.3 Onboarding first-run (excepción)

El setup inicial del workspace (`/onboarding`, SPEC-15) **no** usa AppShell ni FormSheet: es un **modal full-viewport** sobre canvas soft, sin sidebar. Progreso = línea hairline superior. Detalle: `docs/specs/15-workspace-onboarding.md`.

**Patrón FormSheet (resto de creates):**
- CTA en `ContentPanel.actions` (y sidebar “Registrar” → abre el FormSheet global al instante)
- Deep-link opcional: `/transactions?new=1` abre el mismo sheet
- Lista limpia: tablas / progreso sin formulario encima
- Formulario: 1 columna, secciones tipadas, `SegmentedControl` para ≤4 opciones
- Cerrar al éxito / Cancelar

Componentes: `src/components/form-sheet/*`

**Ajustes:** tabs por query (`?tab=perfil|workspace|categorias`). Gestión de categorías en `?tab=categorias`.

### 3.4 Accesibilidad (WCAG 2.2 AA — lo implementado)

| Pieza | Contrato |
|-------|----------|
| Skip link | `SkipLink` → `#main-content` (`SidebarInset`). Primer foco del documento. |
| Landmarkas | `<main id="main-content">` + tab bar `aria-label="Navegación principal"`. |
| Contraste | `--muted-foreground` en claro `oklch(0.445 …)` (labels 12px sobre card blanca). No aclarar sin re-chequear 4.5:1. |
| Foco no tapado | `scroll-padding-bottom` / `scroll-margin-bottom` = altura del tab bar + safe area (`md:` 0). |
| Motion | `prefers-reduced-motion: reduce` en `globals.css` (animación/transición ~0). |
| Nombres | Icon-only: `aria-label` (Registrar, Más, tabs inactivas). |

---

## 3.1 Responsive — mobile first

**El teléfono es la superficie primaria.** Los usuarios usan Finance Hub desde el celular; desktop enriquece, no define el layout.

**Breakpoints (Tailwind default):**

| Token | Ancho | Rol en Finance Hub |
|-------|-------|--------------------|
| (base) | &lt; 640px | Diseño por defecto: 1 columna, tab bar docked, tablas con columnas esenciales |
| `sm` | ≥ 640px | Grids de formularios 2–3 cols; más padding |
| `md` | ≥ 768px | Sidebar navy fijo / colapsable a iconos; Panel: composición desktop (`fh-shell=full`) |
| `lg` | ≥ 1024px | Dashboard: columna principal + rail |
| `xl` | ≥ 1280px | Dashboard 2 col (`1fr` + 340px) cuando aplique |

**Reglas:**

1. Escribir clases **sin** breakpoint primero (móvil). Ampliar con `sm:` / `md:` / `lg:`.
2. **Shell:** en móvil **tab bar docked**; destinos extra en sheet “Más”. Sidebar navy desde `md`.
3. **Tablas densas (sin scroll lateral en móvil):** en base **solo identidad + monto**. Checkbox, estado y acciones se ocultan (`hidden sm:table-cell` / `slot="action"`). Identidad: `min-w-0 truncate`. Monto: `whitespace-nowrap` + `max-w-[38%]`. El wrapper de `Table` usa `overflow-x-hidden` (nunca `overflow-x-auto` en producto). Columnas secundarias con `hideBelow`.
4. **Forms:** create flows en `FormSheet` (1 columna).
5. **Tipografía hero:** `font-heading` + `text-2xl sm:text-3xl md:text-4xl` en patrimonio (cabe en 390px con montos ARS largos).
6. **Touch:** controles críticos ≥ 40px de alto en móvil. `Button` `size="sm"` / `icon-sm` = `h-10` / `size-10` en base, `sm:h-8` / `sm:size-8` desde 640px.
7. **Tabs / section nav:** scroll horizontal o labels cortos en móvil.
8. **Overflow-x, no overflow total:** `overflow-x-hidden` en `html`/`body` y `min-w-0` en `SidebarInset`, `ContentPanel` y `SurfaceSection`. **Nunca** `overflow-hidden` en ambos ejes sobre el body mobile (traba el scroll vertical). No usar `overflow-x-clip`: este Tailwind no emite esa utilidad.
9. **Filas de dinero:** identidad `min-w-0 truncate`; monto acotado (`max-w-[42%]` aprox.) para que la card no empuje el viewport. Grids de listado en dashboard: 1 col en base, 2 cols desde `md` (no desde `sm`).

---

## 4. Tokens de color

Definidos en `:root` / `.dark` de `src/app/globals.css` y expuestos a Tailwind vía `@theme inline`.

### Superficies

| Token | Uso |
|-------|-----|
| `background` | Canvas del shell (slate paper / navy night) |
| `card` / `popover` | Cards, diálogos, menús — blanco en claro |
| `muted` / `secondary` / `accent` | Fondos sutiles, hover neutro en canvas |
| `sidebar` | Rail navy |
| `sidebar-hover` | Hover de items sobre el rail (`white/5`) |

### Texto

| Token | Uso |
|-------|-----|
| `foreground` | Títulos, valores principales en canvas |
| `muted-foreground` | Labels, meta, placeholders en canvas. Claro: `oklch(0.445)` (AA 12px sobre blanco). Oscuro: `oklch(0.78)`. |
| `sidebar-foreground` | Nav idle + meta sobre navy |
| `sidebar-primary-foreground` | Nombre, valores fuertes sobre navy |
| `sidebar-accent-foreground` | Item de nav **activo** (azul claro) |
| `primary-foreground` | Texto sobre CTA azul |

### Acción e interacción

| Token | Uso |
|-------|-----|
| `primary` | Azul sólido (badges, rings, fills) |
| `bg-cta` | Degradé 135° `cta-from` → `cta-to` — **únicos botones primarios** |
| `info` / `info-muted` | Foco, links de acción, tab activa en móvil |
| `ring` | Focus ring (azul) |
| `destructive` | Borrar, errores de formulario (alineado a rose/expense) |

### Semántica financiera (obligatoria en montos / tipos)

| Token | Significado | Origen |
|-------|-------------|--------|
| `income` / `income-muted` | Ingresos | emerald `#10b981` |
| `expense` / `expense-muted` | Gastos | rose `#f43f5e` |
| `transfer` / `transfer-muted` | Transferencias | indigo `#6366f1` |
| `success` / `warning` | Estados de presupuesto / objetivos | |

### Charts

`chart-1` … `chart-5` — blue · emerald · amber · indigo · rose. No inventar paletas ad-hoc.

**Sankey (flujo del mes):** colores vía `income` / `expense` / `foreground`. Dominio: `buildCashflowSankey`; UI: `DashboardCashflowSankey`.

### Tema claro / oscuro

- Provider: `@teispace/next-themes` en `app/layout.tsx`.
- Anti-FOUC: `ThemeProvider` inyecta el script vía `useServerInsertedHTML`.
- Opciones: `src/lib/theme.ts`. Toggle en sidebar: Claro / Oscuro / Sistema.
- **El rail navy no se invierte** — es la firma en ambos temas.
- Claro: canvas slate-50, cards blancas.
- Oscuro: canvas navy night, cards un escalón más claras que el rail.
- **Default = light.** Dark es de primera calidad.
- CTA = degradé azul — **nunca** ink, yellow ni lime.

---

## 5. Tipografía

| Rol | Spec |
|-----|------|
| Familia UI | Plus Jakarta Sans → `--font-sans` (400–700) |
| Display / H1 / H2 / montos | Nunito → `--font-heading` (hasta **800**) |
| Mono / código | Geist Mono → `--font-geist-mono` |
| Page title | 18px · extrabold 800 · Nunito (`font-heading`) |
| Section | 14px · extrabold Nunito |
| Body | 14px · regular Plus Jakarta · leading-5/6 |
| Label / caption | 12px · medium · `text-muted-foreground` |
| Eyebrow (PATRIMONIO, TOTALES) | 10–11px · semibold · `uppercase tracking-widest` |
| Montos | Nunito + `tabular-nums` (clase `.tabular`) |

Peso máximo: **800 en Nunito (títulos y cifras hero)**. Plus Jakarta no pasa de **700**.

---

## 6. Espaciado, radio, elevación

| Sistema | Valor |
|---------|--------|
| Base | 4px |
| Densidad producto | media: padding de cards 20–24px, gaps de sección 16–24px, filas ~12–16px |
| `--radius` | `0.75rem` (12px) — botones, nav, inputs |
| Cards / `rounded-2xl` | `1rem` (16px) |
| Pills / badges / avatares | `rounded-full` |
| Elevación | Level 0 canvas · Level 1 card `border + shadow-card` · Level 2 hover `shadow-card-hover` · Level 3 popover `shadow-md` |

Profundidad: **bordes + sombra suave**. No mezclar con sombras Material pesadas.

---

## 7. Componentes — reglas de construcción

### Orden de decisión

1. ¿Existe en `src/components/ui/`? → usarlo.
2. ¿Se puede extender con `variant` CVA? → extender.
3. ¿Es composición de producto (shell, money row, card de sección)? → `src/components/` (no `ui/`).
4. Solo entonces crear un primitivo nuevo (y documentarlo aquí).

### Variantes (patrón obligatorio)

```tsx
// ✅ Correcto — variante semántica
<Badge variant="income">+$1.200</Badge>
<Button>Guardar</Button>           // default = bg-cta
<Button variant="destructive">Eliminar</Button>

// ❌ Incorrecto — color hardcodeado
<span className="bg-green-100 text-green-700">+$1.200</span>
<span className="bg-[#dbeafe] text-[#2563eb]">Activo</span>
<button className="bg-blue-600">Registrar</button>
```

### Clases Tailwind permitidas vs prohibidas

| Permitido | Prohibido en UI de producto |
|-----------|------------------------------|
| `bg-background`, `bg-card`, `bg-muted`, `bg-cta`, `bg-primary`, `bg-info-muted` | `bg-white`, `bg-zinc-50`, `bg-slate-50`, `bg-blue-50` |
| `text-foreground`, `text-muted-foreground`, `text-income`, `text-sidebar-foreground` | `text-black`, `text-gray-500`, `text-slate-400`, `text-[#171717]` |
| `border-border`, `ring-ring`, `shadow-card` | `border-gray-200`, `ring-blue-500` |
| `rounded-xl`, `rounded-2xl`, `font-heading` | radios/sombras one-off sin escala |

Excepción: `globals.css` (tokens) y assets SVG/marketing aislados.

### Money / datos

- Montos siempre `.tabular` (o `tabular-nums` + `font-heading`).
- Signo y color vía variante (`income` / `expense` / `transfer`).
- Fechas: formato consistente; no inventar layouts de fecha por pantalla.
- **Elegir fecha:** siempre `DateField`. Prohibido `<input type="date">` nativo.

### Barras de progreso (`ProgressBar`)

Usar `src/components/progress-bar.tsx`. **Rosa (`tone="alert"` / `bg-expense`) solo para alerta real** (presupuesto excedido).

| Contexto | Tonos |
|----------|--------|
| Objetivos (`goalProgressTone`) | `<40%` info · `40–79%` progress (`chart-5`) · `≥80%` success |
| Presupuestos (`budgetProgressTone`) | `on_track` info · `warning` caution · `exceeded` **alert** |
| Badge nav Presupuestos | Número = at-risk; `text-warning` si solo warning; **`text-expense` + icono** solo si hay ≥1 exceeded |
| Ranking de gastos (`spendingRankTone`) | `chart-1` / `chart-2` / `chart-3` (cicla; nunca rosa por ranking) |
| Pills de categoría (`categoryPillTone`) | hash estable → `chart-1`…`chart-5`; transferencia/FX → `transfer` |

### Estados obligatorios

Todo control interactivo: default · hover · active · focus-visible · disabled.  
Toda vista de datos: loading (`Skeleton`) · empty · error.

### Motion

- Duración UI &lt; 300ms; ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`).
- Solo `transform` / `opacity`.
- Respetar `prefers-reduced-motion`.
- Acciones de alta frecuencia (atajos, command palette): sin animación.
- CTA: `hover:opacity-90`; press `scale(0.97)` en el `+` móvil.

---

## 8. Catálogo shadcn / producto

| Componente | Path | Notas |
|------------|------|--------|
| Button | `ui/button` | `default` = `bg-cta` font-bold; `outline` / `ghost` secundarios |
| Badge | `ui/badge` | Incluye `info`, `success`, `warning`, `income`, `expense`, `transfer` |
| UsageTip | `components/usage-tip` | Tip contextual dismissible |
| CategoryPill | `features/categories/components/category-pill` | Tono estable `chart-1`…`chart-5` |
| Input | `ui/input` | Fondos/bordes vía tokens |
| Calendar | `ui/calendar` | selección `info`, locale `es` |
| DateField | `components/date-field` | Trigger + popover `Calendar` |
| Table | `ui/table` | Filas con `border-border`; headers muted uppercase tracking |
| Data table | `components/data-table` | Selección + `BulkActionsBar` |
| Sidebar | `ui/sidebar` | `variant="sidebar"`; tokens navy |
| SurfaceSection | `components/surface-section` | Card de producto (16px, `shadow-card`) |
| KpiTile | `components/kpi-tile` | Eyebrow uppercase; montos Nunito |
| ProgressBar | `components/progress-bar` | Tonos semánticos; rosa solo en `alert` |
| Avatar, Dropdown, Tooltip, Separator, Sheet, Skeleton | `ui/*` | Primitivos estándar |

Añadir más con:

```bash
npx shadcn@latest add <component> -y
```

Luego alinear variantes a este documento (nunca dejar colores de demo).

---

## 9. Patrones de pantalla

### Panel / Dashboard (pantallazo en 3 segundos)

Orden de lectura fijo. Chrome = `ContentPanel` (H1 “Resumen” + workspace · mes + CTA) sobre canvas. Bloques = `SurfaceSection` / `KpiTile`.

**Móvil (liviano — app de gasto):**

1. **Barras de gasto mensual** (últimos 6 meses). El mes activo usa `bg-cta`. Transferencias y `fx_*` **no** suman.
2. **Gastos por categoría** — donut con total “Gastado”, barras vs. período anterior, lista. Tocá un mes para filtrar.

Patrimonio, KPIs, actividad, Sankey y cuentas quedan en **`md+`**.

**Desktop (`md+` / `lg:`):**

1. **Hero patrimonio** a ancho de columna + sparkline Balance.
2. **Tres KPIs** en fila (Ingresos · Gastos · Flujo).
3. **Objetivos | Actividad | Atención** — cards. Empty de objetivos: icono + copy + CTA `outline`.
4. **Flujo del mes** — Sankey a ancho completo cuando hay datos.
5. **Próximas recurrentes / Distribución / Cuentas** below-fold.

**Reglas de honestidad numérica:** el número grande es patrimonio; la tendencia y el delta describen **flujo neto mensual**. Cálculo en `features/dashboard/domain`.

Componentes en `src/features/dashboard/components/`. Superficies: `src/components/surface-section.tsx`, `src/components/kpi-tile.tsx` (`variant="plain"` dentro de una superficie existente — nunca card-in-card).

### Lista / tabla (ej. transacciones)

1. H1 + subtítulo (“Movimientos del mes · {workspace}”) + CTA `bg-cta`.
2. Filtros: chips de periodo (`Este mes` / `Esta semana` / `Todo`) + `Filtros`.
3. Strip **TOTALES · N MOVIMIENTOS** — KPIs por moneda (nunca mezclar). Eyebrow uppercase.
4. Tabla en **una** `AbmTable` (`src/components/abm-table`): `SurfaceSection` flush + `BulkActionsBar`. Columnas DESCRIPCIÓN · CUENTA · CATEGORÍA · TIPO · FECHA · MONTO. Headers `AbmHead` (`text-[10px] uppercase tracking-widest`). Celdas `AbmCell`; monto `AbmMoney`; glifo `AbmGlyph`.
5. Filas: icono de tipo/categoría a la izquierda; monto `.tabular` con token de tipo.
6. Checkbox de selección + `BulkActionsBar` cuando aplique.
7. En móvil solo identidad + monto (sin scroll lateral). Checkbox, estado y acciones desde `sm`.
8. Fechas con `formatDateOnly` (`DD/MM/YYYY`).
9. Txs materializadas desde recurrente: indicador muted `Repeat` junto a la descripción.
10. **Recurrentes — confirmar:** CTA solo si `scheduledOn ≤ hoy + 1`.

### Grupos

1. H1 + CTA “+ Nuevo grupo”.
2. Dos KPIs (Total que debés / Total a tu favor) en cards.
3. Lista **Mis grupos**: card por grupo (emoji/icono, última actividad, saldo firmado, avatares, recuento).
4. Empty/CTA al pie: “Crear nuevo grupo” dashed o outline.

### Formulario

- Labels `text-sm text-muted-foreground`.
- Inputs altura consistente (shadcn).
- Error: `text-destructive` + `aria-invalid`.

### Empty state

- Mensaje corto + un CTA `Button` (primario o `outline` según jerarquía).
- Sin ilustraciones genéricas de stock si no aportan.

### Placeholder de sección (si una vista aún no está)

Card centrada, icono muted, título Nunito, copy “Esta sección estará disponible próximamente.” — no dejar la página en blanco.

---

## 10. Do / Don't

### Do

- Cambiar la paleta solo en `globals.css`.
- Usar `cn()` + CVA para variantes.
- Componer el shell con tokens `sidebar*`. El rail es navy siempre.
- Poner cada bloque de dashboard/lista en `SurfaceSection`, no envolver la página entera.
- Revisar `DESIGN.md` antes de una pantalla nueva.

### Don't

- Pegar hex o escalas Tailwind de color (`slate-500`, `blue-600`, `zinc-50`) en JSX de producto.
- Usar `Button` ink/negro como primario, o `rounded-full` en CTAs de página (el prototipo es `rounded-xl`).
- Crear un segundo sistema de botones.
- Volver al content-panel-card envolvente o al sidebar claro tipo Dub.
- Meter lógica de saldos/splits en componentes React.

---

## 11. Checklist antes de mergear UI

- [ ] Sin hex / `bg-zinc-*` / `bg-slate-*` / `text-blue-*` en archivos de producto
- [ ] Colores nuevos (si hacen falta) añadidos como token + clase `@theme`
- [ ] Variantes CVA en lugar de className one-off repetido
- [ ] Focus visible y estados vacíos/loading cubiertos
- [ ] Montos con `.tabular`
- [ ] Shell: sidebar navy flush + canvas slate + cards; tab bar docked **fuera** del flex de `SidebarProvider`
- [ ] Mobile-first: layout base usable &lt; 640px; **sin scroll horizontal** (`scrollWidth === clientWidth`)
- [ ] Skip link + contraste de `muted-foreground` + targets ≥40px en móvil
- [ ] Sin reglas de negocio en la UI

---

## 12. Mapa rápido de clases

```txt
Canvas          bg-background
Sidebar         bg-sidebar · idle: text-sidebar-foreground
                active: bg-sidebar-accent text-sidebar-accent-foreground
Card            bg-card border-border rounded-2xl shadow-card
Texto           text-foreground | text-muted-foreground | font-heading
CTA             bg-cta text-primary-foreground font-bold rounded-xl
Ingreso         text-income | bg-income-muted
Gasto           text-expense | bg-expense-muted
Transferencia   text-transfer | bg-transfer-muted
Info / foco     text-info | bg-info-muted
```
