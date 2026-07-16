/**
 * Budget progress derivation (SPEC-07 FR-02..FR-04).
 *
 * Pure functions: given a budget and the workspace's expense-like ledger,
 * return the derived spent/remaining/status for the active period.
 *
 * Business rules encoded here:
 *   - Only `type === "expense"` transactions count (transfers and incomes are
 *     ignored, SPEC-07 §4 / T-05).
 *   - `occurredOn` must fall in `[start, end]` inclusive (SPEC-07 §4 / T-04).
 *   - When `categoryIds` is non-empty, only expenses whose `categoryId` is in
 *     the set count. When it is empty, every expense counts regardless of
 *     category (SPEC-07 T-06).
 *   - `warning` at `spent >= 80% * limit`, `exceeded` when `spent > limit`
 *     (SPEC-07 FR-04). Remaining is allowed to go negative (SPEC-07 T-03).
 */

import { getBudgetPeriodBounds } from "./period";
import type {
  BudgetExpenseCandidate,
  BudgetLike,
  BudgetPeriodBounds,
  BudgetProgress,
  BudgetStatus,
} from "./types";

export const BUDGET_WARNING_RATIO = 0.8;

/**
 * Expenses that count toward a budget in its active period (same rules as
 * spent). Preserves extra fields on each candidate (e.g. `id`) for detail UIs.
 */
export function listMatchingBudgetExpenses<T extends BudgetExpenseCandidate>(
  budget: Pick<
    BudgetLike,
    "period" | "startDate" | "endDate" | "categoryIds"
  >,
  transactions: readonly T[],
  referenceDate: Date = new Date(),
): T[] {
  const bounds = getBudgetPeriodBounds(budget, referenceDate);
  return filterMatchingExpenses(transactions, budget.categoryIds, bounds);
}

/**
 * SPEC-07 FR-02 — sum expenses in the active period that match the budget's
 * categories.
 */
export function computeBudgetSpent(
  budget: Pick<
    BudgetLike,
    "period" | "startDate" | "endDate" | "categoryIds"
  >,
  transactions: readonly BudgetExpenseCandidate[],
  referenceDate: Date = new Date(),
): number {
  return listMatchingBudgetExpenses(budget, transactions, referenceDate).reduce(
    (sum, tx) => sum + tx.amountCents,
    0,
  );
}

/**
 * SPEC-07 FR-03 — `remaining = limit − spent`. May be negative when the
 * budget is exceeded (SPEC-07 T-03).
 */
export function computeBudgetRemaining(
  limitCents: number,
  spentCents: number,
): number {
  return limitCents - spentCents;
}

/**
 * SPEC-07 FR-04 — Status thresholds:
 *   spent > limit     → "exceeded"
 *   spent >= 80% limit → "warning"
 *   otherwise         → "on_track"
 */
export function computeBudgetStatus(
  spentCents: number,
  limitCents: number,
): BudgetStatus {
  if (spentCents > limitCents) return "exceeded";
  if (spentCents >= limitCents * BUDGET_WARNING_RATIO) return "warning";
  return "on_track";
}

/**
 * Convenience composition — full progress snapshot for a budget in its active
 * period. Callers that need only one part should use the specialized helpers.
 */
export function computeBudgetProgress(
  budget: BudgetLike,
  transactions: readonly BudgetExpenseCandidate[],
  referenceDate: Date = new Date(),
): BudgetProgress {
  const bounds = getBudgetPeriodBounds(budget, referenceDate);
  const matching = filterMatchingExpenses(
    transactions,
    budget.categoryIds,
    bounds,
  );
  const spentCents = matching.reduce((sum, tx) => sum + tx.amountCents, 0);
  const remainingCents = computeBudgetRemaining(budget.limitCents, spentCents);
  const status = computeBudgetStatus(spentCents, budget.limitCents);

  return {
    spentCents,
    remainingCents,
    status,
    periodStart: bounds.start,
    periodEnd: bounds.end,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function filterMatchingExpenses<T extends BudgetExpenseCandidate>(
  transactions: readonly T[],
  categoryIds: readonly string[],
  bounds: BudgetPeriodBounds,
): T[] {
  const startMs = bounds.start.getTime();
  const endMs = bounds.end.getTime();
  const categoryFilter =
    categoryIds.length === 0 ? null : new Set(categoryIds);

  const matched: T[] = [];
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;

    const occurredMs = tx.occurredOn.getTime();
    if (occurredMs < startMs || occurredMs > endMs) continue;

    if (categoryFilter) {
      if (!tx.categoryId || !categoryFilter.has(tx.categoryId)) continue;
    }

    matched.push(tx);
  }
  return matched;
}
