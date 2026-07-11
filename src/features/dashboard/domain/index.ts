export type {
  DashboardAccount,
  DashboardPeriod,
  DashboardTransaction,
  MonthlyCashflow,
  TotalBalance,
} from "./types";

export { getCurrentMonthPeriod } from "./period";
export { computeTotalBalance } from "./total-balance";
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
