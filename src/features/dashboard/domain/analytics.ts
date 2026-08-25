import {
  UNCATEGORIZED_CATEGORY_ID,
  UNCATEGORIZED_CATEGORY_NAME,
  type AnalyticsTransaction,
  type CashflowSummary,
  type Insight,
  type MonthlySeriesPoint,
  type SpendingByCategoryRow,
} from "./analytics-types";

export function yearMonthUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isExpense(tx: AnalyticsTransaction): boolean {
  return tx.type === "expense";
}

function isCashflowType(
  tx: AnalyticsTransaction,
): tx is AnalyticsTransaction & { type: "income" | "expense" } {
  return tx.type === "income" || tx.type === "expense";
}

/**
 * SPEC-11 T-01 / T-02 — Aggregate expenses by category.
 * Transfers and `fx_*` (account-to-account / FX legs) are excluded.
 * Uncategorized expenses fold into a synthetic "Sin categoría" row so the
 * category total matches cashflow expenseCents.
 */
export function aggregateSpendingByCategory(
  transactions: readonly AnalyticsTransaction[],
): SpendingByCategoryRow[] {
  const map = new Map<string, SpendingByCategoryRow>();

  for (const tx of transactions) {
    if (!isExpense(tx)) continue;
    const categoryId = tx.categoryId ?? UNCATEGORIZED_CATEGORY_ID;
    const categoryName =
      tx.categoryName?.trim() ||
      (tx.categoryId ? tx.categoryId : UNCATEGORIZED_CATEGORY_NAME);
    const existing = map.get(categoryId);
    if (existing) {
      existing.amountCents += tx.amountCents;
      existing.transactionCount = (existing.transactionCount ?? 0) + 1;
    } else {
      map.set(categoryId, {
        categoryId,
        categoryName,
        amountCents: tx.amountCents,
        transactionCount: 1,
      });
    }
  }

  return [...map.values()].toSorted((a, b) => b.amountCents - a.amountCents);
}

/**
 * SPEC-11 FR-01 / FR-03 — Expenses by category for each YYYY-MM in `yearMonths`.
 * Same exclusion rules as `aggregateSpendingByCategory`.
 */
export function aggregateSpendingByCategoryByMonth(
  transactions: readonly AnalyticsTransaction[],
  yearMonths: readonly string[],
): Record<string, SpendingByCategoryRow[]> {
  const buckets = new Map<string, AnalyticsTransaction[]>();
  for (const ym of yearMonths) {
    buckets.set(ym, []);
  }

  for (const tx of transactions) {
    if (!isExpense(tx)) continue;
    const ym = yearMonthUtc(tx.occurredOn);
    const list = buckets.get(ym);
    if (!list) continue;
    list.push(tx);
  }

  const result: Record<string, SpendingByCategoryRow[]> = {};
  for (const ym of yearMonths) {
    result[ym] = aggregateSpendingByCategory(buckets.get(ym) ?? []);
  }
  return result;
}

export function summarizeCashflow(
  transactions: readonly AnalyticsTransaction[],
): CashflowSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const tx of transactions) {
    if (tx.type === "income") incomeCents += tx.amountCents;
    else if (isExpense(tx)) expenseCents += tx.amountCents;
  }
  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
  };
}

/**
 * Build monthly series for the last `months` calendar months ending at `end`.
 * `yearMonth` is YYYY-MM in UTC date parts of occurredOn (@db.Date).
 */
export function buildMonthlySeries(
  transactions: readonly AnalyticsTransaction[],
  months: number,
  end: Date = new Date(),
): MonthlySeriesPoint[] {
  const points: MonthlySeriesPoint[] = [];
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth(); // 0-based

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(endYear, endMonth - i, 1));
    const yearMonth = yearMonthUtc(d);
    points.push({ yearMonth, incomeCents: 0, expenseCents: 0 });
  }

  const index = new Map(points.map((p, i) => [p.yearMonth, i]));

  for (const tx of transactions) {
    if (!isCashflowType(tx)) continue;
    const ym = yearMonthUtc(tx.occurredOn);
    const idx = index.get(ym);
    if (idx === undefined) continue;
    const point = points[idx];
    if (!point) continue;
    if (tx.type === "income") point.incomeCents += tx.amountCents;
    else point.expenseCents += tx.amountCents;
  }

  return points;
}

/**
 * Deterministic insight engine (SPEC-11 FR-04, T-03, T-04).
 */
export function computeInsights(input: {
  currentSpending: SpendingByCategoryRow[];
  previousSpending: SpendingByCategoryRow[];
  budgetsExceededCount: number;
}): Insight[] {
  const insights: Insight[] = [];
  const top = input.currentSpending[0];
  if (top && top.amountCents > 0) {
    insights.push({
      kind: "top_category",
      categoryId: top.categoryId,
      categoryName: top.categoryName,
      amountCents: top.amountCents,
    });

    const prev = input.previousSpending.find(
      (r) => r.categoryId === top.categoryId,
    );
    const previousCents = prev?.amountCents ?? 0;
    if (previousCents > 0) {
      const variationPercent =
        Math.round(((top.amountCents - previousCents) / previousCents) * 1000) /
        10;
      insights.push({
        kind: "category_variation",
        categoryId: top.categoryId,
        categoryName: top.categoryName,
        previousCents,
        currentCents: top.amountCents,
        variationPercent,
      });
    }
  }

  if (input.budgetsExceededCount > 0) {
    insights.push({
      kind: "budgets_exceeded",
      count: input.budgetsExceededCount,
    });
  }

  return insights;
}
