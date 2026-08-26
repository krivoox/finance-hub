/** Synthetic id for expenses without a category. Never a real category id. */
export const UNCATEGORIZED_CATEGORY_ID = "_uncategorized";
export const UNCATEGORIZED_CATEGORY_NAME = "Sin categoría";

export type SpendingByCategoryRow = {
  categoryId: string;
  categoryName: string;
  amountCents: number;
  /** How many expense txs folded into this row. Optional for older fixtures. */
  transactionCount?: number;
};

export type CashflowSummary = {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

export type MonthlySeriesPoint = {
  yearMonth: string; // YYYY-MM
  incomeCents: number;
  expenseCents: number;
};

export type Insight =
  | {
      kind: "top_category";
      categoryId: string;
      categoryName: string;
      amountCents: number;
    }
  | {
      kind: "category_variation";
      categoryId: string;
      categoryName: string;
      previousCents: number;
      currentCents: number;
      /** Percent change rounded to 1 decimal as integer tenths? Use ratio * 100. */
      variationPercent: number;
    }
  | {
      kind: "budgets_exceeded";
      count: number;
    };

export type AnalyticsTransaction = {
  type: "income" | "expense" | "transfer" | "fx_debit" | "fx_credit";
  amountCents: number;
  categoryId: string | null;
  categoryName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  occurredOn: Date;
};
