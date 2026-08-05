import type { MonthlySeriesPoint } from "./analytics-types";

export type NetTrendPoint = {
  yearMonth: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

export type NetTrend = {
  points: NetTrendPoint[];
  /** Net of the last month in the series (0 when empty). */
  currentNetCents: number;
  /** Net of the month before the last one, when the series has ≥ 2 points. */
  previousNetCents: number | null;
  /**
   * Percent change of the current net vs the previous one, rounded to one
   * decimal. `null` when there is no comparable previous month.
   */
  variationPercent: number | null;
  /** Largest |net| in the series — chart scaling for Balance mode. */
  maxAbsNetCents: number;
  /** Largest income in the series — chart scaling for Ingresos mode. */
  maxIncomeCents: number;
  /** Largest expense in the series — chart scaling for Gastos mode. */
  maxExpenseCents: number;
};

/**
 * SPEC-12 §4 — Net per month (income − expense) derived from the analytics
 * monthly series. No new business rule: same definition already used by
 * `computeMonthlyCashflow` / `summarizeCashflow`, projected over N months so
 * the dashboard can chart the trend (Balance / Ingresos / Gastos).
 */
export function buildNetTrend(
  series: readonly MonthlySeriesPoint[],
): NetTrend {
  const points: NetTrendPoint[] = series.map((p) => ({
    yearMonth: p.yearMonth,
    incomeCents: p.incomeCents,
    expenseCents: p.expenseCents,
    netCents: p.incomeCents - p.expenseCents,
  }));

  let maxAbsNetCents = 0;
  let maxIncomeCents = 0;
  let maxExpenseCents = 0;
  for (const point of points) {
    const abs = Math.abs(point.netCents);
    if (abs > maxAbsNetCents) maxAbsNetCents = abs;
    if (point.incomeCents > maxIncomeCents) maxIncomeCents = point.incomeCents;
    if (point.expenseCents > maxExpenseCents) {
      maxExpenseCents = point.expenseCents;
    }
  }

  const current = points.at(-1);
  const previous = points.length >= 2 ? points.at(-2) : undefined;
  const currentNetCents = current?.netCents ?? 0;
  const previousNetCents = previous?.netCents ?? null;

  let variationPercent: number | null = null;
  if (previousNetCents !== null && previousNetCents !== 0) {
    const ratio =
      (currentNetCents - previousNetCents) / Math.abs(previousNetCents);
    variationPercent = Math.round(ratio * 1000) / 10;
  }

  return {
    points,
    currentNetCents,
    previousNetCents,
    variationPercent,
    maxAbsNetCents,
    maxIncomeCents,
    maxExpenseCents,
  };
}
