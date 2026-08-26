# Spec 12 — Dashboard

| Campo | Valor |
|-------|-------|
| ID | SPEC-12 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-03, SPEC-05, SPEC-07, SPEC-08, SPEC-09; preview recurrentes SPEC-18; cotizaciones SPEC-19 (opcional) |

> **KRI-29.** El dashboard es del workspace **personal**. `memberBalances` de workspace `group` y el CTA “Ver grupo” hacia tenant **salen**. Un chip later hacia `/groups` (deudas de SplitGroup) es opcional; no es patrimonio del hogar.

## 1. Contexto

Pantalla principal: visión clara del estado financiero del workspace personal.

## 2. Historias de usuario

1. Al entrar, quiero ver patrimonio / liquidez de un vistazo.
2. Quiero un resumen del mes: ingresos, gastos, neto.
3. Quiero atajos a presupuestos en riesgo y objetivos activos.
4. En grupo, quiero ver también balances entre miembros.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Query `GetDashboard` agrega datos del workspace |
| FR-02 | Bloques: balances por moneda, cashflow del periodo, budgets warning/exceeded, goals activas, txs recientes, **próximas recurrentes** (SPEC-18) |
| FR-03 | Si group: incluir member balances summary |
| FR-04 | Periodo corriente según timezone (mes calendario). Misma definición de “este mes” que el listado de Transacciones ([SPEC-05](./05-transactions.md) §4.3 / `getCurrentMonthPeriod`) |
| FR-05 | UI consume solo el DTO del query (sin recalcular negocio) |
| FR-06 | Si hay ≥2 monedas con saldo y tasa de consolidación: patrimonio `≈` en `baseCurrency` + caption TC |
| FR-07 | Sin tasa: solo breakdown por moneda (no inventar conversión 1:1) |
| FR-08 | Preview de próximas ocurrencias recurrentes (horizonte corto; ver SPEC-18): read-only, no materializa |
| FR-09 | Si SPEC-19 habilitado: caption/CTA puede ofrecer “Usar MEP de hoy” (apply explícito a consolidación); el feed **no** sobrescribe el TC solo. Attribution si se muestran cotizaciones |

## 4. Reglas de negocio

- Balances nativos: suma por moneda de accounts no archivadas (convención credit). Nunca sumar ARS+USD crudos.
- Patrimonio consolidado: lectura con `WorkspaceConsolidationRate` (manual, o apply explícito desde MEP — SPEC-19); prefijo `≈` en UI. El feed diario **no** muta la tasa sin acción del usuario.
- Cashflow: incomes − expenses del mes **por moneda** (transfers y `fx_*` excluidos — KRI-34). El patrimonio (saldos de cuentas) sí refleja transfers entre cuentas; los KPIs Ingresos / Gastos / Flujo y el donut de categorías no.
- “Recientes”: últimas N transacciones (default 10); cada una en su moneda.
- Dashboard es **read model**; lógica de cálculo reutiliza servicios de dominio ya testeados.

## 5. Comandos y consultas

| Tipo | Nombre | Output (conceptual) |
|------|--------|---------------------|
| Query | `GetDashboard` | `{ balancesByCurrency, totalBalance (base), consolidated?, fxRate?, cashflow, budgetsAtRisk, goals, recentTransactions, upcomingRecurring?, memberBalances? }` |

## 6. Criterios de aceptación

- [ ] GetDashboard testeado con fakes: números coherentes con specs 03/05/07/08/10.
- [ ] Workspace vacío: ceros y listas vacías, no error.
- [ ] UI no duplica fórmulas.

## 7. Escenarios de test (TDD)

### T-01 Empty workspace

- **Given** sin accounts  
- **When** GetDashboard  
- **Then** balances vacíos / totalBalance=0, lists empty

### T-02 Cashflow mes

- **Given** income 100000 ARS, expense 40000 ARS este mes; expense mes pasado 999  
- **Then** cashflow.income=100000, expense=40000, net=60000 (en la moneda del resumen)

### T-02b Multi-moneda

- **Given** 500_000 ARS + 1_000 USD; tasa 1 USD = 1_400 ARS  
- **When** GetDashboard  
- **Then** balancesByCurrency expone ambos; consolidated ≈ 1_900_000 ARS + caption TC

### T-03 Budgets at risk

- **Given** un budget exceeded y uno on_track  
- **Then** budgetsAtRisk contiene solo exceeded/warning

### T-04 Group section

- **Given** group con deuda Bob→Ana  
- **Then** memberBalances presente

### T-05 Personal sin memberBalances

- **Given** personal  
- **Then** memberBalances undefined/null

## 8. Fuera de alcance

- Widgets configurables por usuario
- Comparativas anuales en el primer viewport
- Cards decorativas sin acción (seguir DESIGN.md / interface-design)
- Materializar recurrentes desde el dashboard (solo preview; confirmar en `/transactions/recurring`, SPEC-18)

## 9. Notas de UI

- Una composición clara; métricas accionables
- Seguir `DESIGN.md` y skill interface-design
- Snapshot con acentos `income`/`expense` sutiles; Sankey con tabs *Ingresos → gastos* y *Cuentas → gastos*
- No meter analytics densos adicionales en el primer viewport; deep-dive en SPEC-11
- Cotizaciones (SPEC-19): preferir mini-card en sidebar + caption/CTA liviano aquí; no un segundo widget denso de FX en el primer viewport. Distinguir copy “Cotización” vs “TC de consolidación”.
- **Móvil (~390px):** home del Panel = barras de gasto mensual + card de categorías (donut). Las cards no empujan el viewport (`scrollWidth === clientWidth`). Filas de dinero: identidad `min-w-0 truncate`; monto acotado. Overflow del shell: [DESIGN.md](../../DESIGN.md) §3.1.
- **Donut “Gastos por categoría”:** el anillo escala al ancho de la card; el total del hoyo usa notación compacta y/o un cuerpo menor cuando el monto formateado no cabe (p. ej. `ARS 4.447.413,29`). El total es solo `expense` (sin transfers).

## 10. Notas de implementación

- `GetDashboard` reutiliza services existentes (`listAccounts`, `listTransactions`, `listBudgetsWithStatus`, `listGoals`, balances de grupo).
- En el mismo request RSC, auth/tenancy y el snapshot de presupuestos están memoizados por request (`React.cache`) para no triplicar SQL al combinar layout (badge), `GetDashboard` y analytics — [architecture.md §7.1](../architecture.md).
- El home móvil del Panel usa `getAnalyticsHome` (serie mensual + gastos por categoría por mes) y no espera `GetDashboard` ni insights.
- Cookie `fh-shell` (`compact` | `full`): la escribe el AppShell con `matchMedia(md)`, no User-Agent. Sin cookie → compact. En compact el servidor **no** arranca `GetDashboard`/`getAnalytics`. Primer load desktop o resize: `router.refresh()` tras alinear la cookie. No es cache de saldos (SPEC-20).
- No hay cache cross-request del read model: tras mutaciones, `revalidatePath` vuelve a cargar datos frescos.
