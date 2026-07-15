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
| **Cómo debe sentirse** | Calmado, preciso, premium-light — como un escritorio financiero limpio, no un dashboard ruidoso. |

**Dominio (metáforas):** ledger, saldos, flujo de caja, presupuestos, objetivos, splits compartidos.  
**Mundo de color:** papel blanco, tinta negra, gris frío de escritorio, azul de acción (selección), verde ingreso, rojo egreso.  
**Firma:** sidebar único (workspace + CTA + nav agrupada + usuario) + panel de contenido; sin franja de iconos oscura.  
**Defaults que rechazamos:** cards genéricas en grid 3×N, purple-indigo SaaS, cream+serif terracotta, dark-mode-first, hex sueltos en componentes.

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
| Header app | `SidebarTrigger` + título | Barra superior del inset |
| Content panel | `bg-card` · `rounded-xl` · `border` | Dentro de `SidebarInset` |

**Mobile:** el sidebar shadcn abre como **sheet** a pantalla completa (no icon rail). El content panel es edge-to-edge sin radio; `md+` añade inset, borde y `rounded-xl`.

---

## 3.1 Responsive — mobile first

**Breakpoints (Tailwind default):**

| Token | Ancho | Rol en Finance Hub |
|-------|-------|--------------------|
| (base) | &lt; 640px | Diseño por defecto: 1 columna, nav sheet, tablas con columnas esenciales |
| `sm` | ≥ 640px | Grids de formularios 2–3 cols; más padding |
| `md` | ≥ 768px | Sidebar fijo / colapsable a iconos; content panel con inset |
| `lg` | ≥ 1024px | Dashboard 2 columnas (objetivos \| gastos) |

**Reglas:**

1. Escribir clases **sin** breakpoint primero (móvil). Ampliar con `sm:` / `md:` / `lg:`.
2. **Shell:** en móvil solo header (`SidebarTrigger` + título) + contenido; menú via sheet.
3. **Tablas densas:** en base mostrar 2–3 columnas (identidad + monto). Columnas secundarias con `hidden sm:table-cell` / `md:table-cell`. El wrapper `Table` ya permite scroll horizontal como fallback.
4. **Forms:** un campo por fila en base; `sm:grid-cols-*` para alinear. Evitar `grid-cols-[1fr_120px]` sin breakpoint — usar `grid-cols-1 sm:grid-cols-[minmax(0,1fr)_7.5rem]`.
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

### Barras de progreso (`ProgressBar`)

Usar `src/components/progress-bar.tsx`. **Rojo (`tone="alert"` / `bg-expense`) solo para alerta real** (presupuesto excedido).

| Contexto | Tonos |
|----------|--------|
| Objetivos (`goalProgressTone`) | `<40%` info · `40–79%` progress (`chart-5`) · `≥80%` success |
| Presupuestos (`budgetProgressTone`) | `on_track` info · `warning` caution · `exceeded` **alert** |
| Ranking de gastos (`spendingRankTone`) | `chart-1` / `chart-2` / `chart-3` (cicla; nunca rojo) |

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
| Input | `ui/input` | Fondos/bordes vía tokens |
| Table | `ui/table` | Filas con `border-border`; headers muted |
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

### Dashboard (pantallazo en 3 segundos)

Orden de lectura fijo — no aplanar todo al mismo peso:

1. **Snapshot** — un solo bloque: Patrimonio (hero `text-4xl`) → Flujo neto del mes (secundario, color income/expense) → Ingresos/Gastos como soporte. Sin grid de 3 cards iguales.
2. **Atención** — presupuestos en riesgo, insights, balances de grupo. Si no hay nada: un quiet “Sin alertas”.
3. **Progreso + gastos** — dos columnas: objetivos con barra · top categorías del mes.
4. **Actividad** — movimientos recientes (tabla).

Componentes en `src/features/dashboard/components/`. La page solo compone el DTO.

### Lista / tabla (ej. movimientos)

1. Título de página en el content panel.
2. Search / filtros debajo (`Input` + chips con `Badge`).
3. `Table` full-width; checkbox opcional; menú `⋯` por fila.
4. Sin cards por fila.

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
