import type {
  AnalyticsTransaction,
  CashflowSummary,
  Insight,
  MonthlySeriesPoint,
  SpendingByCategoryRow,
} from "./analytics-types";

/**
 * SPEC-11 T-01 / T-02 — Aggregate expenses by category. Transfers excluded.
 */
export function aggregateSpendingByCategory(
  transactions: readonly AnalyticsTransaction[],
): SpendingByCategoryRow[] {
  const map = new Map<string, SpendingByCategoryRow>();

  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    if (!tx.categoryId) continue;
    const existing = map.get(tx.categoryId);
    if (existing) {
      existing.amountCents += tx.amountCents;
    } else {
      map.set(tx.categoryId, {
        categoryId: tx.categoryId,
        categoryName: tx.categoryName ?? tx.categoryId,
        amountCents: tx.amountCents,
      });
    }
  }

  return [...map.values()].toSorted((a, b) => b.amountCents - a.amountCents);
}

export function summarizeCashflow(
  transactions: readonly AnalyticsTransaction[],
): CashflowSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const tx of transactions) {
    if (tx.type === "income") incomeCents += tx.amountCents;
    else if (tx.type === "expense") expenseCents += tx.amountCents;
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
    const yearMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    points.push({ yearMonth, incomeCents: 0, expenseCents: 0 });
  }

  const index = new Map(points.map((p, i) => [p.yearMonth, i]));

  for (const tx of transactions) {
    if (tx.type !== "income" && tx.type !== "expense") continue;
    const ym = `${tx.occurredOn.getUTCFullYear()}-${String(tx.occurredOn.getUTCMonth() + 1).padStart(2, "0")}`;
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
