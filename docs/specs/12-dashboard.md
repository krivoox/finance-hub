# Spec 12 — Dashboard

| Campo | Valor |
|-------|-------|
| ID | SPEC-12 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-03, SPEC-05, SPEC-07, SPEC-08, SPEC-09 |

## 1. Contexto

Pantalla principal: visión clara del estado financiero del workspace activo (personal o grupal).

## 2. Historias de usuario

1. Al entrar, quiero ver patrimonio / liquidez de un vistazo.
2. Quiero un resumen del mes: ingresos, gastos, neto.
3. Quiero atajos a presupuestos en riesgo y objetivos activos.
4. En grupo, quiero ver también balances entre miembros.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Query `GetDashboard` agrega datos del workspace |
| FR-02 | Bloques: total balance, cashflow del periodo corriente, budgets warning/exceeded, goals activas, txs recientes |
| FR-03 | Si group: incluir member balances summary |
| FR-04 | Periodo corriente según timezone (mes calendario) |
| FR-05 | UI consume solo el DTO del query (sin recalcular negocio) |

## 4. Reglas de negocio

- Total balance: suma de accounts no archivadas con convención credit.
- Cashflow: incomes − expenses del mes (transfers excluidas).
- “Recientes”: últimas N transacciones (default 10).
- Dashboard es **read model**; lógica de cálculo reutiliza servicios de dominio ya testeados.

## 5. Comandos y consultas

| Tipo | Nombre | Output (conceptual) |
|------|--------|---------------------|
| Query | `GetDashboard` | `{ totalBalance, cashflow, budgetsAtRisk, goals, recentTransactions, memberBalances? }` |

## 6. Criterios de aceptación

- [ ] GetDashboard testeado con fakes: números coherentes con specs 03/05/07/08/10.
- [ ] Workspace vacío: ceros y listas vacías, no error.
- [ ] UI no duplica fórmulas.

## 7. Escenarios de test (TDD)

### T-01 Empty workspace

- **Given** sin accounts  
- **When** GetDashboard  
- **Then** totalBalance=0, lists empty

### T-02 Cashflow mes

- **Given** income 100000, expense 40000 este mes; expense mes pasado 999  
- **Then** cashflow.income=100000, expense=40000, net=60000

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

## 9. Notas de UI

- Una composición clara; métricas accionables
- Seguir `DESIGN.md` y skill interface-design
- No meter analytics densos en el primer viewport; deep-dive en SPEC-11

## 10. Notas de implementación

- `GetDashboard` reutiliza services existentes (`listAccounts`, `listTransactions`, `listBudgetsWithStatus`, `listGoals`, balances de grupo).
- En el mismo request RSC, auth/tenancy y el snapshot de presupuestos están memoizados por request (`React.cache`) para no triplicar SQL al combinar layout (badge), `GetDashboard` y analytics — [architecture.md §7.1](../architecture.md).
- No hay cache cross-request del read model: tras mutaciones, `revalidatePath` vuelve a cargar datos frescos.
