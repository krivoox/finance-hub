export type {
  DashboardAccount,
  DashboardPeriod,
  DashboardTransaction,
  MonthlyCashflow,
  TotalBalance,
} from "./types";

export { getCurrentMonthPeriod } from "./period";
export { computeTotalBalance } from "./total-balance";
export {
  computeBalancesByCurrency,
  balancesByCurrencyEntries,
} from "./balances-by-currency";
export type { BalancesByCurrency } from "./balances-by-currency";
export {
  CONSOLIDATION_RATE_SCALE,
  ConsolidationRateDomainError,
  InvalidConsolidationRateError,
  UnsupportedConversionError,
  arsPerUsdToRateScaled,
  assertValidConsolidationRate,
  computeConsolidatedNetWorth,
  convertArsUsdCents,
  convertCents,
  rateScaledToArsPerUsd,
} from "./consolidation";
export type { ConsolidationRateLike } from "./consolidation";
export { computeMonthlyCashflow } from "./cashflow";
export { selectRecentTransactions } from "./recent-transactions";
export {
  selectBudgetsAtRisk,
  selectActiveGoalsProgress,
  type BudgetAtRiskItem,
  type GoalProgressItem,
  type MemberBalanceItem,
} from "./enrichment";
export {
  aggregateSpendingByCategory,
  summarizeCashflow,
  buildMonthlySeries,
  computeInsights,
} from "./analytics";
export type {
  AnalyticsTransaction,
  CashflowSummary,
  Insight,
  MonthlySeriesPoint,
  SpendingByCategoryRow,
} from "./analytics-types";

export { buildCashflowSankey } from "./cashflow-sankey";
export type {
  BuildCashflowSankeyInput,
  CashflowSankey,
  CashflowSankeyLink,
  CashflowSankeyNode,
  CashflowSankeyNodeKind,
} from "./cashflow-sankey";

export {
  aggregateSpendingFlows,
  buildAccountExpenseSankey,
} from "./account-sankey";
export type {
  BuildAccountExpenseSankeyInput,
  SpendingFlow,
} from "./account-sankey";
