export type SpendingByCategoryRow = {
  categoryId: string;
  categoryName: string;
  amountCents: number;
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
  type: "income" | "expense" | "transfer";
  amountCents: number;
  categoryId: string | null;
  categoryName?: string | null;
  occurredOn: Date;
};
