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

- Solo type expense/income; transfers excluidas de “gastos”.
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

- La pantalla `/dashboard` orquesta `GetDashboard` + analytics (`getAnalytics`) en paralelo con el mismo `now`.
- `getAnalytics` puede recibir `budgetsExceededCount` cuando el caller ya tiene el conteo (p. ej. desde budgets at risk del dashboard); si no, reutiliza `ListBudgetsWithProgress` (snapshot request-cached compartido con el dashboard).
- El insight `budgetsExceededCount` sigue siendo reglas puras sobre ese conteo (TDD en domain).
