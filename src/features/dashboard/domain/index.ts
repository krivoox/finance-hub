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
} from "./enrichment";
export {
  aggregateSpendingByCategory,
  aggregateSpendingByCategoryByMonth,
  summarizeCashflow,
  buildMonthlySeries,
  computeInsights,
  yearMonthUtc,
} from "./analytics";
export type {
  AnalyticsTransaction,
  CashflowSummary,
  Insight,
  MonthlySeriesPoint,
  SpendingByCategoryRow,
} from "./analytics-types";
export {
  UNCATEGORIZED_CATEGORY_ID,
  UNCATEGORIZED_CATEGORY_NAME,
} from "./analytics-types";

export { buildNetTrend } from "./net-trend";
export type { NetTrend, NetTrendPoint } from "./net-trend";

export {
  buildCategoryShares,
  hiddenCategoryRows,
  OTHER_CATEGORY_ID,
  rankedSpendingRows,
} from "./category-share";
export type { CategoryShare, CategoryShares } from "./category-share";

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
