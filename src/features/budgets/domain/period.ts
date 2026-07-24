/**
 * SPEC-07 FR-06 — Period bounds for a budget.
 *
 * Budget periods anchor on `startDate`. The active period is the one that
 * contains `referenceDate`. Bounds are inclusive on both ends (SPEC-07 §4)
 * so an expense with `occurredOn === end` counts.
 *
 * All arithmetic runs in UTC-day space because `Transaction.occurredOn` is
 * stored as `@db.Date` and read back by Prisma as UTC-midnight. Timezone
 * handling for user-facing anchoring is deferred (see FR-06 spec note); the
 * MVP treats calendar days as UTC.
 */

import type { BudgetLike, BudgetPeriodBounds } from "./types";

const MS_PER_DAY = 86_400_000;

/**
 * Return period bounds for the active period of `budget` given a reference
 * date (defaults to `new Date()`).
 */
export function getBudgetPeriodBounds(
  budget: Pick<BudgetLike, "period" | "startDate" | "endDate">,
  referenceDate: Date = new Date(),
): BudgetPeriodBounds {
  if (budget.period === "custom") {
    if (!budget.endDate) {
      throw new Error(
        "getBudgetPeriodBounds: custom budget missing endDate — guard should prevent this",
      );
    }
    return {
      start: toUtcMidnight(budget.startDate),
      end: toUtcMidnight(budget.endDate),
    };
  }

  if (budget.period === "weekly") {
    return getWeeklyBounds(budget.startDate, referenceDate);
  }

  return getMonthlyBounds(budget.startDate, referenceDate);
}

/**
 * Smallest inclusive window covering every budget's active period at
 * `referenceDate`. Used to limit expense queries to dates that can affect
 * progress (instead of loading the full workspace ledger).
 *
 * Returns `null` when there are no budgets.
 */
export function unionBudgetPeriodBounds(
  budgets: readonly Pick<BudgetLike, "period" | "startDate" | "endDate">[],
  referenceDate: Date = new Date(),
): BudgetPeriodBounds | null {
  if (budgets.length === 0) return null;

  let startMs = Number.POSITIVE_INFINITY;
  let endMs = Number.NEGATIVE_INFINITY;

  for (const budget of budgets) {
    const bounds = getBudgetPeriodBounds(budget, referenceDate);
    const s = bounds.start.getTime();
    const e = bounds.end.getTime();
    if (s < startMs) startMs = s;
    if (e > endMs) endMs = e;
  }

  return { start: new Date(startMs), end: new Date(endMs) };
}

// ---------------------------------------------------------------------------
// Monthly
// ---------------------------------------------------------------------------

/**
 * Monthly periods start on the same day-of-month as `startDate`. If the target
 * month has fewer days, the anchor is clamped to the last day of that month
 * (e.g. Jan 31 → Feb 28). Bounds are inclusive: end = nextStart − 1 day.
 */
function getMonthlyBounds(
  startDate: Date,
  referenceDate: Date,
): BudgetPeriodBounds {
  const startUtc = toUtcMidnight(startDate);
  const refUtc = toUtcMidnight(referenceDate);

  if (refUtc.getTime() < startUtc.getTime()) {
    const nextStart = addMonthsClamped(startUtc, 1);
    return {
      start: startUtc,
      end: addDays(nextStart, -1),
    };
  }

  const startYear = startUtc.getUTCFullYear();
  const startMonth = startUtc.getUTCMonth();
  const startDay = startUtc.getUTCDate();

  const refYear = refUtc.getUTCFullYear();
  const refMonth = refUtc.getUTCMonth();

  let offset = (refYear - startYear) * 12 + (refMonth - startMonth);

  const candidateStart = addMonthsClamped(startUtc, offset);
  if (refUtc.getTime() < candidateStart.getTime()) {
    offset -= 1;
  }

  const periodStart = addMonthsClamped(startUtc, offset);
  const periodEnd = addDays(addMonthsClamped(startUtc, offset + 1), -1);

  // Guard against clamping producing a shorter month whose end wraps back
  // before the ref date's month boundary; not possible with the algorithm
  // above but keeps intent explicit.
  void startDay;

  return { start: periodStart, end: periodEnd };
}

// ---------------------------------------------------------------------------
// Weekly
// ---------------------------------------------------------------------------

/**
 * Weekly periods span 7 days starting on the anchor day. Bounds are inclusive.
 */
function getWeeklyBounds(
  startDate: Date,
  referenceDate: Date,
): BudgetPeriodBounds {
  const startUtc = toUtcMidnight(startDate);
  const refUtc = toUtcMidnight(referenceDate);

  if (refUtc.getTime() < startUtc.getTime()) {
    return {
      start: startUtc,
      end: addDays(startUtc, 6),
    };
  }

  const diffDays = Math.floor(
    (refUtc.getTime() - startUtc.getTime()) / MS_PER_DAY,
  );
  const offsetWeeks = Math.floor(diffDays / 7);
  const periodStart = addDays(startUtc, offsetWeeks * 7);
  const periodEnd = addDays(periodStart, 6);

  return { start: periodStart, end: periodEnd };
}

// ---------------------------------------------------------------------------
// Date helpers (UTC-day arithmetic)
// ---------------------------------------------------------------------------

function toUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Adds `months` calendar months to `date`, clamping the day-of-month to the
 * last day of the target month when necessary (Jan 31 + 1 month → Feb 28/29).
 */
function addMonthsClamped(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();

  const rawMonth = m + months;
  const targetYear = y + Math.floor(rawMonth / 12);
  const targetMonth = ((rawMonth % 12) + 12) % 12;

  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  const targetDay = Math.min(d, lastDayOfTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay));
}
