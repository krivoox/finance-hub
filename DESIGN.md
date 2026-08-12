# Finance Hub — Design System

> Referencia visual: [Dub](https://dub.co/) (producto + brand kit).  
> Stack UI: **shadcn/ui** (Radix) + Tailwind CSS v4 + tokens semánticos en `src/app/globals.css`.  
> Fuente de verdad de producto: `docs/`. Este archivo es la fuente de verdad de **UI/UX**.

---

## 1. Intent

| Pregunta | Respuesta |
|----------|-----------|
| **Quién** | Persona o pareja que abre la app entre tareas del día para registrar un gasto, mirar saldos o revisar el presupuesto. |
| **Qué debe lograr** | Entender el estado del dinero en segundos y actuar (registrar, transferir, ajustar presupuesto). |
| **Cómo debe sentirse** | Calmado, preciso, premium — escritorio financiero en blanco/gris neutro, con color solo donde comunica (ingresos, egresos, foco). |

**Dominio (metáforas):** ledger, saldos, flujo de caja, presupuestos, objetivos, splits compartidos.  
**Mundo de color:** blanco y grises neutros (sin croma azul en superficies), tinta, verde ingreso, rojo egreso, azul solo como acento de acción (`info`). Dark: charcoal neutro en escalera.  
**Firma:** sidebar (desktop) + tab bar flotante (móvil) + panel de contenido; Sankey de flujo en el dashboard (md+).  
**Defaults que rechazamos:** cards genéricas en grid 3×N, purple-indigo SaaS, cream+serif terracotta, papel azulado / cool wash, dark-mode-first sin toggle, canvas beige cálido como default, CTA lime/yellow, hex sueltos en componentes.

---

## 2. Principios

1. **Tokens primero.** Todo color pasa por variables CSS semánticas. Cero hex / `zinc-*` / `blue-*` en UI de producto.
2. **Variantes, no overrides.** Estilos repetidos viven en CVA (`variant` / `size`) del componente shadcn o de un wrapper de producto.
3. **Un acento interactivo.** El azul `info` comunica selección y foco. El negro `primary` comunica acción primaria (CTA).
4. **Jerarquía por peso y color, no solo por tamaño.** Labels muted + valores en `foreground` + montos con `tabular-nums`.
5. **Profundidad quieta.** Bordes hairline + sombra suave. Sin drop-shadows dramáticos.
6. **shadcn antes que inventar.** Buscar en `src/components/ui/*` antes de crear un control nuevo.
7. **La UI no contiene reglas de negocio.** Solo presenta datos ya resueltos por domain/application.
8. **Mobile-first.** El layout base es el teléfono. `sm:` / `md:` / `lg:` solo enriquecen; nunca al revés (`max-md:` como regla general está prohibido salvo excepciones puntuales).

---

## 3. App shell (layout firma)

Sidebar único estilo dashboard (shadcn inset) — **sin** rail de iconos oscuro.

```
┌────────────────────┬──────────────────────────────────────────┐
│ Sidebar            │  Header (trigger + título de página)     │
│ · workspace        ├──────────────────────────────────────────┤
│ · Registrar + CTA  │  Content panel (card)                    │
│ · nav principal    │  título · filtros · tabla / vista        │
│ · grupos           │                                          │
│ · user / ajustes   │                                          │
└────────────────────┴──────────────────────────────────────────┘
```

| Zona | Token / clase | Notas |
|------|---------------|--------|
| Sidebar | `bg-sidebar` | Un solo panel; collapsible a iconos |
| Workspace header | logo + nombre + chevron | Arriba del todo |
| CTA rápida | `Button` pill “Registrar” + icon button | Fila bajo el workspace |
| Item nav idle | `SidebarMenuButton` | Icono stroke + label |
| Item nav active | `data-active` → `bg-sidebar-accent` | Highlight neutro (no azul) |
| Grupos | `SidebarGroupLabel` | Ej. Planificación, Compartido |
| Header app | `SidebarTrigger` + título | Solo `md+` (barra superior del inset) |
| Tema | `ThemeToggle` en footer | Claro / Oscuro / Sistema |
| Content panel | `bg-card` · `rounded-2xl` · `border` | Dentro de `SidebarInset`; CTAs de header en pill; H1 de página aquí |

**Mobile:** navegación primaria = **tab bar flotante** (pill) anclado abajo con `safe-area-inset-bottom`. Sin header sticky de título (el H1 vive en `ContentPanel`); `safe-area-inset-top` en el wrapper de contenido. El hamburger/`SidebarTrigger` queda para `md+`. El content panel es edge-to-edge sin radio; `md+` añade inset, borde y `rounded-xl`.

#### 3.1.1 Mobile tab bar

| Slot | Destino | Notas |
|------|---------|--------|
| Panel | `/dashboard` | Home |
| Transacciones | `/transactions` | Actividad diaria |
| **+ Registrar** | acción (no ruta) | Abre `NewTransactionSheet` vía store; CTA ink elevado |
| Presupuestos | `/budgets` | Planificación; badge at-risk si aplica |
| Más | sheet bottom | Cuentas, Objetivos, Grupos, Recurrentes, Ajustes, workspace, tema, salir |

**Craft:** contenedor `bg-card` / `border-border` / `rounded-full` / `shadow-md` (no lime, no glass púrpura). Activo = pill `bg-secondary` + icono + label; inactivos = solo icono (`sr-only` label). CTA central ink elevado. Clearance del contenido: `pb-[calc(4.75rem+env(safe-area-inset-bottom))]`. En móvil el canvas del inset (y un underlay fijo detrás del pill) usa `bg-card` — el mismo token que el content panel edge-to-edge — para que clearance/safe-area no muestren el `bg-background` casi negro del dark mode.

**Desktop (`md+`):** sidebar inset intacto; tab bar `md:hidden`.

### 3.2 Create flows — FormSheet (no forms en la lista)

Los formularios de carga (movimientos, cuentas, presupuestos, objetivos) **no viven en la página de lista**. Se abren en un **sheet lateral derecho** (`FormSheet`).

| Viewport | Comportamiento |
|----------|----------------|
| Móvil | Sheet a **pantalla completa** (`w-full` / `h-dvh`, sin borde lateral) |
| `sm+` | Drawer fijo (`sm:max-w-md` / `lg` para movimientos) — la lista queda visible detrás |

**Cerrar:** botón X en el header del sheet — `outline`, `rounded-full`, target táctil ≥40px en móvil (`size-10`). Neutro (alineado al chrome del panel); no usar `destructive` (reservado a egresos y acciones destructivas).

**Por qué no modal centrado:** los forms tienen muchos campos y secciones condicionales (splits, categorías). Un modal estrecho scrollería mal y competiría visualmente. El sheet escala mejor mobile → desktop y es el patrón de Dub / Linear / Stripe.

### 3.3 Onboarding first-run (excepción)

El setup inicial del workspace (`/onboarding`, SPEC-15) **no** usa AppShell ni FormSheet: es un **modal full-viewport** sobre canvas soft, sin sidebar (para no escapar por el menú). Progreso = línea hairline superior. Detalle: `docs/specs/15-workspace-onboarding.md`.

**Patrón FormSheet (resto de creates):**
- CTA en `ContentPanel.actions` (y sidebar “Registrar” → abre el FormSheet global al instante)
- Deep-link opcional: `/transactions?new=1` abre el mismo sheet
- Lista limpia: tablas / progreso sin formulario encima
- Formulario: 1 columna, secciones tipadas, `SegmentedControl` para ≤4 opciones
- Cerrar al éxito / Cancelar

Componentes: `src/components/form-sheet/*`

**Ajustes:** tabs por query (`?tab=perfil|workspace|categorias`). Gestión de categorías en `?tab=categorias`.

---

## 3.1 Responsive — mobile first

**Breakpoints (Tailwind default):**

| Token | Ancho | Rol en Finance Hub |
|-------|-------|--------------------|
| (base) | &lt; 640px | Diseño por defecto: 1 columna, nav sheet, tablas con columnas esenciales |
| `sm` | ≥ 640px | Grids de formularios 2–3 cols; más padding |
| `md` | ≥ 768px | Sidebar fijo / colapsable a iconos; content panel con inset |
| `lg` | ≥ 1024px | Dashboard: columna principal + rail (gastos/cuentas) |

**Reglas:**

1. Escribir clases **sin** breakpoint primero (móvil). Ampliar con `sm:` / `md:` / `lg:`.
2. **Shell:** en móvil **tab bar flotante** (sin barra de título duplicada); destinos extra en sheet “Más”. Sidebar + header de título desde `md`.
3. **Tablas densas:** en base mostrar 2–3 columnas (identidad + monto). Columnas secundarias con `hidden sm:table-cell` / `md:table-cell`. El wrapper `Table` ya permite scroll horizontal como fallback.
4. **Forms:** create flows en `FormSheet` (1 columna). No grids multi-columna densos en sheets.
5. **Tipografía hero:** `text-3xl sm:text-4xl` en patrimonio / cifras clave.
6. **Touch:** controles críticos ≥ 40px de alto en móvil (`h-10` / padding); no depender solo de hover.
7. **Tabs / section nav:** scroll horizontal o labels cortos en móvil; descripciones largas `hidden sm:block`.
8. **Nunca** bloquear el viewport con `overflow-hidden` en el body mobile sin sheet/scroll interno claro.

---

## 4. Tokens de color

Definidos en `:root` / `.dark` de `src/app/globals.css` y expuestos a Tailwind vía `@theme inline`.

### Superficies

| Token | Uso |
|-------|-----|
| `background` | Canvas del shell |
| `card` / `popover` | Paneles, diálogos, menús |
| `muted` / `secondary` / `accent` | Fondos sutiles, hover neutro |
| `sidebar` | Nav secundaria |
| `sidebar-rail` | Rail de iconos |

### Texto

| Token | Uso |
|-------|-----|
| `foreground` | Títulos, valores principales |
| `muted-foreground` | Labels, meta, placeholders |
| `sidebar-foreground` | Items de nav |
| `primary-foreground` | Texto sobre CTA negro |

### Acción e interacción

| Token | Uso |
|-------|-----|
| `primary` | CTA principal (tinta / ink) |
| `info` / `info-muted` | Foco, links de acción, nav activa |
| `ring` | Focus ring (alineado al azul info) |
| `destructive` | Borrar, errores de formulario |

### Semántica financiera (obligatoria en montos / tipos)

| Token | Significado |
|-------|-------------|
| `income` / `income-muted` | Ingresos |
| `expense` / `expense-muted` | Gastos |
| `transfer` / `transfer-muted` | Transferencias |
| `success` / `warning` | Estados de presupuesto / objetivos |

### Charts

`chart-1` … `chart-5` — series de analytics. No inventar paletas ad-hoc en componentes de gráfico.

**Sankey (flujo del mes):** diagrama de flujo ingresos → hub → categorías / disponible. Colores vía `income` / `expense` / `foreground`. Dominio: `buildCashflowSankey`; UI: `DashboardCashflowSankey`.

### Tema claro / oscuro

- Provider: `@teispace/next-themes` (fork compatible React 19 / Next 16) en `app/layout.tsx`.
- Anti-FOUC: `ThemeProvider` inyecta el script vía `useServerInsertedHTML` (path por defecto; evita el warning de React 19 con `<script>` en el árbol).
- Opciones compartidas: `src/lib/theme.ts`. Toggle en sidebar (`ThemeToggle`): Claro / Oscuro / Sistema.
- Tokens en `:root` y `.dark` de `globals.css` — superficies **acromáticas** (blanco / gris / charcoal); color solo en acentos semánticos.
- Sin atmósfera radial en `body` (nada de wash azul/verde sobre el canvas).
- **Default = light** (blanco neutro). Dark es de primera calidad, no la identidad de marca.
- **Dark craft:** escala de grises charcoal neutra: `background` → `sidebar` → `card` (panel) → `secondary`/`muted` (widgets). Separación por escalón de gris, no por borders duros. Income/success = mint. CTA = ink invertido — **nunca** yellow/lime.
- **Cómo verlo (dark):** ThemeToggle → **Oscuro**.
- **Referencias externas:** dashboards tipo “Zarss” sirven como craft de elevación en dark, no como paleta de marca ni como default light. No adoptar canvas beige cálido ni dark-first sin toggle.

---

## 5. Tipografía

| Rol | Spec |
|-----|------|
| Familia UI | Geist Sans → `--font-sans` |
| Mono / código | Geist Mono → `--font-geist-mono` |
| Display / page title | 24px · semibold · tracking-tight |
| Section | 18px · semibold |
| Body | 14px · regular · leading-5/6 |
| Label / caption | 12px · medium · `text-muted-foreground` |
| Montos | mismo size que el contexto + `tabular-nums` (clase `.tabular` o `tabular-nums`) |

Peso máximo habitual: **600**. Evitar 700+ salvo excepciones documentadas.

---

## 6. Espaciado, radio, elevación

| Sistema | Valor |
|---------|--------|
| Base | 4px |
| Densidad producto | media-compacta (Dub): padding de filas ~12–16px, gaps de sección 24–32px |
| `--radius` | `0.75rem` (12px) — base shadcn |
| Inputs / botones | `rounded-lg` |
| Content panel / modales | `rounded-2xl` |
| Pills / badges | `rounded-full` |
| Elevación | Level 0 flat · Level 1 `border` · Level 2 `border + shadow-sm` · Level 3 popover/modal `shadow-md` |

Profundidad: **bordes + sombra suave**. No mezclar con sombras Material pesadas.

---

## 7. Componentes — reglas de construcción

### Orden de decisión

1. ¿Existe en `src/components/ui/`? → usarlo.
2. ¿Se puede extender con `variant` CVA? → extender.
3. ¿Es composición de producto (shell, money row)? → `src/components/` (no `ui/`).
4. Solo entonces crear un primitivo nuevo (y documentarlo aquí).

### Variantes (patrón obligatorio)

```tsx
// ✅ Correcto — variante semántica
<Badge variant="income">+$1.200</Badge>
<Button variant="default">Guardar</Button>
<Button variant="destructive">Eliminar</Button>

// ❌ Incorrecto — color hardcodeado
<span className="bg-green-100 text-green-700">+$1.200</span>
<span className="bg-[#dbeafe] text-[#2563eb]">Activo</span>
```

### Clases Tailwind permitidas vs prohibidas

| Permitido | Prohibido en UI de producto |
|-----------|------------------------------|
| `bg-background`, `bg-card`, `bg-muted`, `bg-primary`, `bg-info-muted` | `bg-white`, `bg-zinc-50`, `bg-blue-50` |
| `text-foreground`, `text-muted-foreground`, `text-income` | `text-black`, `text-gray-500`, `text-[#171717]` |
| `border-border`, `ring-ring` | `border-gray-200`, `ring-blue-500` |
| `rounded-lg`, `rounded-2xl`, `shadow-sm` | radios/sombras one-off sin escala |

Excepción: assets SVG/marketing fuera del app shell pueden usar valores literales si están aislados.

### Money / datos

- Montos siempre `tabular-nums`.
- Signo y color vía variante (`income` / `expense`), no concatenando strings de color en el JSX.
- Fechas: formato consistente; no inventar layouts de fecha por pantalla.
- **Elegir fecha:** siempre `DateField` (trigger tipo input con `DD/MM/YYYY` + popover con `Calendar`). Prohibido `<input type="date">` nativo: rompe tokens, idioma y densidad. El valor interno sigue siendo `DateOnly` (`YYYY-MM-DD`); campos opcionales usan `clearable`.

### Barras de progreso (`ProgressBar`)

Usar `src/components/progress-bar.tsx`. **Rojo (`tone="alert"` / `bg-expense`) solo para alerta real** (presupuesto excedido).

| Contexto | Tonos |
|----------|--------|
| Objetivos (`goalProgressTone`) | `<40%` info · `40–79%` progress (`chart-5`) · `≥80%` success |
| Presupuestos (`budgetProgressTone`) | `on_track` info · `warning` caution · `exceeded` **alert** |
| Badge nav Presupuestos | Número = at-risk; `text-warning` si solo warning; **`text-expense` + icono** solo si hay ≥1 exceeded |
| Ranking de gastos (`spendingRankTone`) | `chart-1` / `chart-2` / `chart-3` (cicla; nunca rojo) |
| Pills de categoría (`categoryPillTone`) | hash estable → `chart-1`…`chart-5`; transferencia/FX → `transfer` |

### Estados obligatorios

Todo control interactivo: default · hover · active · focus-visible · disabled.  
Toda vista de datos: loading (`Skeleton`) · empty · error.

### Motion

- Duración UI &lt; 300ms; ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`).
- Solo `transform` / `opacity`.
- Respetar `prefers-reduced-motion`.
- Acciones de alta frecuencia (atajos, command palette): sin animación.

---

## 8. Catálogo shadcn instalado

| Componente | Path | Notas |
|------------|------|--------|
| Button | `ui/button` | `default` = ink CTA; `outline` / `ghost` secundarios |
| Badge | `ui/badge` | Incluye `info`, `success`, `warning`, `income`, `expense`, `transfer` |
| UsageTip | `components/usage-tip` | Tip contextual dismissible (`fh:tips:v1`); nota al margen + CTA opcional |
| CategoryPill | `features/categories/components/category-pill` | Pill en tablas: tono estable `chart-1`…`chart-5` vía hash de `categoryId` (`categoryPillTone`); transferencia/FX → `transfer`; sin pill si es `—` |
| Input | `ui/input` | Fondos/bordes vía tokens |
| Calendar | `ui/calendar` | react-day-picker con tokens: selección `info`, hoy `info-muted`, locale `es` (semana Lu–Do), celdas 40px en móvil / 36px `sm+` |
| DateField | `components/date-field` | Campo de fecha (trigger + popover `Calendar`), atajo “Hoy”, `clearable` en fechas opcionales |
| Table | `ui/table` | Filas con `border-border`; headers muted |
| Data table | `components/data-table` | Selección: `useRowSelection`, checkbox header/fila, `BulkActionsBar` |
| Sidebar | `ui/sidebar` | Base para nav; componer rail + secundaria encima |
| Avatar, Dropdown, Tooltip, Separator, Sheet, Skeleton | `ui/*` | Primitivos estándar |
| ProgressBar | `components/progress-bar` | Tonos semánticos; rojo solo en `alert` |

Añadir más con:

```bash
npx shadcn@latest add <component> -y
```

Luego alinear variantes a este documento (nunca dejar colores de demo).

---

## 9. Patrones de pantalla

### Panel / Dashboard (pantallazo en 3 segundos)

Orden de lectura fijo — no aplanar todo al mismo peso. Chrome = `SurfaceSection` / `KpiTile` (mismo radio y borde que la landing). Base = una columna apilada; el grid de 2 columnas entra en `lg:`.

**Móvil (liviano):**

1. **Patrimonio** — número hero + 3 KPIs (Ingresos / Gastos / Flujo). Sin serie `MonthlyNetBars` (queda en `md+`).
2. **Barra segmentada de gastos** (`DashboardSpendingBar`) — top categorías del mes + “Ver todo”.
3. **Actividad reciente** — 4 filas + “Ver todo”.
4. Objetivos / Atención / Recurrentes / Cuentas below-the-fold. Sankey y donut completo en `md+`.

**Desktop (`md+` / `lg:`):**

1. **Hero + actividad** (`lg:` 1.5fr | 1fr):
   - `DashboardBalance` — patrimonio (`text-3xl sm:text-4xl`, `≈` si es consolidado), badges multi-moneda, **serie mensual** (`MonthlyNetBars` con modos Balance / Ingresos / Gastos: en Balance, barras divergentes income↑ / expense↓ sobre baseline punteada; tooltip al hover/foco), delta `±% flujo vs. mes anterior` cuando hay mes comparable, y pie con 3 stats `KpiTile variant="plain"`: Ingresos · Gastos · Flujo del mes.
   - `DashboardRecent` — últimos movimientos como **lista** (icono de tipo + descripción + categoría/fecha + monto firmado). Sin tabla: en el rail y en móvil las columnas secundarias no aportan. Cada tx en **su** moneda.
2. **Objetivos | Atención** — progreso de metas (con ahorrado / objetivo) y alertas de presupuesto / insights / balances de grupo.
3. **Flujo del mes** — Sankey a ancho completo (tabs *Cuentas → gastos* / *Ingresos → gastos*).
4. **Próximas recurrentes** — preview read-only (SPEC-18): chip de día + mes a la izquierda (`hoy` resaltado con `info`), grid de 2 columnas en `sm:`.
5. **Distribución de gastos | Cuentas** — donut por categoría (paleta `chart-1…5`, cola agrupada en “Otras” con gris neutro) + leyenda con monto y %; lista de cuentas con icono por tipo y convención credit card (`− monto` en `expense` cuando hay deuda).

**Reglas de honestidad numérica:** el número grande es patrimonio; la tendencia y el delta describen **flujo neto mensual** y se etiquetan como tales. Todo cálculo (neto por mes, shares por categoría) vive en `features/dashboard/domain` con tests (`buildNetTrend`, `buildCategoryShares`) — la UI solo formatea.

Componentes en `src/features/dashboard/components/`. La page solo compone el DTO. Superficies compartidas: `src/components/surface-section.tsx`, `src/components/kpi-tile.tsx` (`variant="plain"` para stats dentro de una superficie existente — nunca card-in-card).

**Pendiente (gap de datos):** widget de “racha” tipo heatmap — requiere una serie diaria de actividad que hoy no existe en el DTO de SPEC-12. No inventarlo con datos derivados en UI.

### Lista / tabla (ej. transacciones)

1. Título de página en el content panel.
2. Search / filtros debajo (`Input` + chips con `Badge`).
3. `Table` full-width con **checkbox de selección en la primera columna** (header = seleccionar todo). Primitivas: `src/components/data-table.tsx` (`useRowSelection`, `SelectAllHead`, `SelectRowCell`, `BulkActionsBar`).
4. Menú `⋯` por fila cuando hay acciones de fila (pausar, editar, etc.).
5. Sin cards por fila.
6. Columnas alineadas: identidad · categoría · cuenta · monto · meta (fecha / frecuencia / estado). En móvil solo esenciales (`hidden sm|md|lg:table-cell`).
7. Fechas de tabla con `formatDateOnly` (`DD/MM/YYYY`).
8. **Meta de origen:** txs materializadas desde una recurrente (SPEC-18) muestran un indicador muted `Repeat` / 🔄 junto a la descripción (no badge de color — es meta, no jerarquía). Tooltip: “Generada por: {nombre}”. Mismo patrón que el badge de aporte a objetivo (SPEC-08).
9. **Recurrentes — confirmar:** el botón Confirmar solo aparece si `scheduledOn ≤ hoy + 1` (`canMaterializeOn`). Ocurrencias futuras muestran “Desde {fecha}” sin CTA.
10. **Totales del filtrado (SPEC-05 §4.6):** strip sticky bajo filtros en móvil + fila de pie “Suma / Totales” bajo la columna Monto en `sm+`. Montos `tabular-nums` con tokens `income` / `expense` / `transfer`; nunca mezclar monedas. Headers de tabla muted (`text-xs font-normal text-muted-foreground`); pills de tipo/categoría donde aporten.

### Formulario

- Labels `text-sm text-muted-foreground`.
- Inputs altura consistente (shadcn default).
- Error: `text-destructive` + `aria-invalid` (el primitivo ya cablea ring).

### Empty state

- Mensaje corto + un CTA `Button`.
- Sin ilustraciones genéricas de stock si no aportan.

---

## 10. Do / Don't

### Do

- Cambiar la paleta solo en `globals.css`.
- Usar `cn()` + CVA para variantes.
- Componer el shell con tokens `sidebar*` / `sidebar-rail*`.
- Revisar `DESIGN.md` antes de una pantalla nueva.

### Don't

- Pegar hex o escalas Tailwind de color (`zinc-500`, `blue-600`) en JSX de producto.
- Crear un segundo sistema de botones “porque este es especial”.
- Usar cards decorativas donde basta tipografía + whitespace.
- Meter lógica de saldos/splits en componentes React.

---

## 11. Checklist antes de mergear UI

- [ ] Sin hex / `bg-zinc-*` / `text-blue-*` en archivos de producto
- [ ] Colores nuevos (si hacen falta) añadidos como token + clase `@theme`
- [ ] Variantes CVA en lugar de className one-off repetido
- [ ] Focus visible y estados vacíos/loading cubiertos
- [ ] Montos con `tabular-nums`
- [ ] Shell: sidebar inset (sheet en móvil) + content panel
- [ ] Mobile-first: layout base usable &lt; 640px; tablas/forms sin desborde
- [ ] Sin reglas de negocio en la UI

---

## 12. Mapa rápido de clases

```txt
Canvas          bg-background
Sidebar         bg-sidebar · active: bg-sidebar-accent
Panel           bg-card border-border rounded-xl
Texto           text-foreground | text-muted-foreground
CTA             bg-primary text-primary-foreground
Ingreso         text-income | bg-income-muted
Gasto           text-expense | bg-expense-muted
Transferencia   text-transfer | bg-transfer-muted
Info / foco     text-info | bg-info-muted
```
