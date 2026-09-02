# Spec 07 — Presupuestos

| Campo | Valor |
|-------|-------|
| ID | SPEC-07 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-05 |

## 1. Contexto

Los presupuestos limitan el gasto por categoría(s) en un periodo para controlar hábitos y detectar desvíos.

## 2. Historias de usuario

1. Quiero definir un presupuesto mensual para “Comida”.
2. Quiero ver cuánto llevo gastado vs el límite.
3. Quiero alertarme conceptualmente cuando supero el 80% o el 100% (dato derivado; UI muestra estado).
4. Quiero abrir un presupuesto y ver los gastos del periodo que suman a ese límite.
5. Quiero ver en el menú lateral cuántos presupuestos necesitan atención, y si alguno ya está excedido.
6. En el **listado** de presupuestos, quiero ver de un vistazo las **categorías** asociadas (pills), sin abrir el detalle.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Crear budget: name, period, limit, categoryIds, startDate |
| FR-02 | Calcular `spent` = Σ expenses en periodo ∩ categorías |
| FR-03 | Calcular `remaining` = limit − spent |
| FR-04 | Estado: `on_track` \| `warning` (≥80%) \| `exceeded` (>100%) |
| FR-05 | Actualizar límite / categorías; archivar budget |
| FR-06 | Periodo monthly: ancla en startDate + timezone del workspace owner o user |
| FR-07 | Detalle: listar expenses del periodo activo que matchean el budget (mismo filtro que FR-02) |
| FR-08 | Badge de nav en Presupuestos: número = presupuestos no archivados en `warning` o `exceeded` (at-risk); si hay ≥1 `exceeded`, además icono crítico (`text-expense`); si solo `warning`, número con tono caution y sin icono rojo; si 0, sin badge. Accesible vía `aria-label` que diferencie atención vs exceso. Sin badges en otros ítems de nav (v1). |
| FR-09 | Listado (`/budgets`, activos y archivados): mostrar pills de categorías por presupuesto. `categoryIds` vacío → pill “Todas” (todas las expense). Si hay muchas, mostrar un máximo compacto y colapsar el resto en `+N` (tooltip con nombres). Resolver nombres también para categorías archivadas vinculadas. |

## 4. Reglas de negocio

- Solo expenses cuentan; transfers, incomes, `fx_*` (SPEC-16) y **ajustes de saldo** ([SPEC-22](./22-balance-adjustment.md)) no.
- **Spent solo suma expenses con `tx.currency === budget.currency`.**
- `budget.currency ∈ { ARS, USD }`; default al crear = `workspace.baseCurrency`.
- categoryIds vacío = todas las expense del workspace **en esa moneda**.
- limit > 0 (en la moneda del budget).
- Periodos no solapados para el mismo set exacto de categorías (MVP: permitir solape pero documentar; preferir warning en UI).
- Spent usa `occurredOn` en el rango [start, end] inclusive.

## 5. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Command | `CreateBudget` |
| Command | `UpdateBudget` |
| Command | `ArchiveBudget` |
| Query | `ListBudgetsWithProgress` |
| Query | `GetBudgetProgress` |
| Query | `GetBudgetDetail` |

## 6. Criterios de aceptación

- [ ] Progress correcto con expenses en borde de fechas.
- [ ] Transfer no incrementa spent.
- [ ] Warning en 80%, exceeded sobre 100%.
- [ ] Nav: 0 at-risk → sin badge.
- [ ] Nav: solo warning → número visible, sin icono crítico.
- [ ] Nav: ≥1 exceeded (solo o mezclado con warning) → número = total at-risk + icono crítico.
- [ ] Nav: `aria-label` diferencia “al límite / cerca” vs “hay presupuestos excedidos”.
- [x] Listado: pills de categorías bajo el nombre (activos y archivados); vacío → “Todas”; overflow `+N`.

## 7. Escenarios de test (TDD)

### T-01 Spent básico

- **Given** budget comida 100000; expense comida 40000  
- **When** GetBudgetProgress  
- **Then** spent=40000, remaining=60000, status=on_track

### T-02 Warning

- **Given** limit 100000; spent 80000  
- **Then** status=warning

### T-03 Exceeded

- **Given** spent 100001  
- **Then** status=exceeded, remaining negativo permitido como número

### T-04 Fuera de periodo

- **Given** expense con fecha fuera  
- **Then** no suma a spent

### T-05 Transfer ignorada

- **Given** transfer en el periodo  
- **Then** spent sin cambio

### T-05b Otra moneda ignorada

- **Given** budget ARS; expense USD misma categoría y periodo  
- **Then** spent sin cambio

### T-06 Todas las categorías

- **Given** categoryIds=[]  
- **When** cualquier expense  
- **Then** suma a spent

### T-07 Detalle — movimientos asociados

- **Given** budget comida; expenses comida in-period + transport + out-of-period  
- **When** GetBudgetDetail / `listMatchingBudgetExpenses`  
- **Then** solo expenses comida del periodo; suma = spent

### T-08 Nav signal — resumen at-risk / exceeded

- **Given** budgets: on_track, warning, exceeded, warning archivado  
- **When** `summarizeBudgetNavSignal`  
- **Then** `{ atRisk: 2, exceeded: 1 }`

### T-09 Nav badge — severidad

- **Given** `budgetsAtRisk=2`, `budgetsExceeded=0`  
- **When** `budgetNavBadgePresentation`  
- **Then** severity=`caution`, sin señal de icono crítico; aria menciona límite

- **Given** `budgetsAtRisk=3`, `budgetsExceeded≥1`  
- **When** `budgetNavBadgePresentation`  
- **Then** severity=`critical`; aria menciona excedidos; count=3

## 8. Fuera de alcance

- Presupuestos enrollables / rollover automático
- Notificaciones push
- Presupuesto por cuenta
- Budget multi-moneda mixto / conversión automática de spent

## 9. Notas de implementación

- Query `ListBudgetsWithProgress` (`listBudgetsWithStatus`): carga un **snapshot** request-scoped (budgets + expenses en la ventana de periodos activos, excluyendo categorías de aporte SPEC-14) y calcula `progress` por llamada con `referenceDate`. Ya incluye `categoryIds` por budget (no hace falta un query aparte para el listado).
- Listado UI (FR-09): la página resuelve nombres con `listCategories` (`includeArchived: true`) → mapa `id → name`; componente `BudgetCategoryPills` reutiliza `CategoryPill` (tonos `chart-*`). Presentación pura; sin reglas de spent nuevas.
- Badge de nav: `summarizeBudgetsAtRisk` / `summarizeBudgetNavSignal` reutiliza ese snapshot (una pasada → `{ atRisk, exceeded }`; no un listado aparte del ledger completo). Umbrales 80%/100% no cambian.
- Detalle: [architecture.md §7.1](../architecture.md).
