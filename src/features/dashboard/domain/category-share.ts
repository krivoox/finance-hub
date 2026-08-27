import type { SpendingByCategoryRow } from "./analytics-types";

/** Synthetic id for the aggregated tail slice. Never a real category id. */
export const OTHER_CATEGORY_ID = "__other__";

export type CategoryShare = {
  categoryId: string;
  categoryName: string;
  amountCents: number;
  /** Share of `totalCents`, rounded to one decimal. */
  percent: number;
};

export type CategoryShares = {
  slices: CategoryShare[];
  totalCents: number;
};

const DEFAULT_LIMIT = 5;

/**
 * SPEC-11 / SPEC-12 — Turns the spending-by-category ranking into shares of
 * the period total, collapsing everything past `limit` into a single "Otras"
 * slice (only when the tail has ≥ 2 categories, so nothing gets hidden behind
 * a synthetic label for free).
 */
export function buildCategoryShares(
  rows: readonly SpendingByCategoryRow[],
  options: { limit?: number } = {},
): CategoryShares {
  const limit = options.limit ?? DEFAULT_LIMIT;

  const positive = rows.filter((r) => r.amountCents > 0);
  const totalCents = positive.reduce((sum, r) => sum + r.amountCents, 0);

  if (totalCents === 0) {
    return { slices: [], totalCents: 0 };
  }

  const sorted = positive.toSorted((a, b) => b.amountCents - a.amountCents);
  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit);

  const kept = tail.length > 1 ? head : sorted;
  const slices: CategoryShare[] = kept.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    amountCents: row.amountCents,
    percent: toPercent(row.amountCents, totalCents),
  }));

  if (tail.length > 1) {
    const amountCents = tail.reduce((sum, r) => sum + r.amountCents, 0);
    slices.push({
      categoryId: OTHER_CATEGORY_ID,
      categoryName: "Otras",
      amountCents,
      percent: toPercent(amountCents, totalCents),
    });
  }

  return { slices, totalCents };
}

/**
 * Real categories folded into the synthetic "Otras" slice. Empty when the
 * donut did not collapse a tail (nothing to disclose).
 */
export function hiddenCategoryRows(
  rows: readonly SpendingByCategoryRow[],
  slices: readonly CategoryShare[],
): SpendingByCategoryRow[] {
  const hasOther = slices.some((s) => s.categoryId === OTHER_CATEGORY_ID);
  if (!hasOther) return [];

  const keptIds = new Set(
    slices
      .filter((s) => s.categoryId !== OTHER_CATEGORY_ID)
      .map((s) => s.categoryId),
  );

  return rankedSpendingRows(rows).filter((row) => !keptIds.has(row.categoryId));
}

/** Positive spending rows, ranked by amount desc. No synthetic "Otras". */
export function rankedSpendingRows(
  rows: readonly SpendingByCategoryRow[],
): SpendingByCategoryRow[] {
  return rows
    .filter((r) => r.amountCents > 0)
    .toSorted((a, b) => b.amountCents - a.amountCents);
}

function toPercent(amountCents: number, totalCents: number): number {
  return Math.round((amountCents / totalCents) * 1000) / 10;
}
