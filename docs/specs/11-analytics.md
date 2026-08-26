# Spec 11 — Analytics e insights

| Campo | Valor |
|-------|-------|
| ID | SPEC-11 |
| Estado | Draft |
| Prioridad | P2 |
| Dependencias | SPEC-05, SPEC-07 |

## 1. Contexto

Herramientas de análisis para comprender hábitos de consumo, oportunidades de ahorro y progreso.

## 2. Historias de usuario

1. Quiero ver gastos por categoría en un periodo.
2. Quiero comparar este mes vs el anterior.
3. Quiero un insight simple (“gastaste 20% más en comida”).

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Query gastos agregados por categoría en rango de fechas |
| FR-02 | Query ingresos vs gastos por periodo |
| FR-03 | Serie temporal mensual (últimos N meses) |
| FR-04 | Insight engine mínimo: reglas deterministas testeables |
| FR-05 | Filtro por account opcional |

## 4. Reglas de negocio

- Solo type expense/income; transfers y `fx_*` excluidas de “gastos”. Los expenses sin categoría se agrupan en “Sin categoría” para que el total coincida con el cashflow.
- Agregaciones en centavos; porcentajes con redondeo documentado (1 decimal en display, tests sobre base points o ratio racional).
- Insights MVP (ejemplos):
  - Categoría con mayor gasto del periodo
  - Variación % vs periodo anterior para top categoría
  - Budgets exceeded count

## 5. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Query | `GetSpendingByCategory` |
| Query | `GetCashflowSummary` |
| Query | `GetMonthlySeries` |
| Query | `GetInsights` |

## 6. Criterios de aceptación

- [ ] Totales cuadran con suma de transacciones filtradas.
- [ ] Insights son funciones puras sobre aggregates (TDD).

## 7. Escenarios de test (TDD)

### T-01 By category

- **Given** expenses comida 100, transporte 50  
- **When** GetSpendingByCategory  
- **Then** mapa correcto; total 150

### T-02 Exclude transfers

- **Given** transfer 999  
- **Then** no aparece en spending

### T-03 Insight top category

- **Given** comida dominante  
- **When** GetInsights  
- **Then** incluye insight `top_category` con categoryId comida

### T-04 Variación

- **Given** mes actual comida 120, anterior 100  
- **Then** insight variation +20%

## 8. Fuera de alcance

- ML / predicción
- Export CSV (P2+ separado)
- Benchmarks externos

## 9. Notas de implementación

- La pantalla `/dashboard` elige el read model según `fh-shell` (`compact` &lt; `md`, `full` ≥ `md`; default compact). Compact arranca solo `getAnalyticsHome`. Full arranca `GetDashboard` + `getAnalytics`. CSS no evita trabajo RSC: no se monta el árbol que no corresponde.
- Las txs de analytics se cargan una vez por request (`React.cache`); el home móvil solo espera serie mensual + gastos por categoría por mes (no presupuestos ni insights). `getAnalytics` usa `listBudgetsWithStatus` (mismo snapshot cacheado que el dashboard) para el insight `budgetsExceededCount`.
- El insight `budgetsExceededCount` sigue siendo reglas puras sobre ese conteo (TDD en domain).
