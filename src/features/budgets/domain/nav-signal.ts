/**
 * Nav badge signal for budgets (SPEC-07).
 *
 * Counts non-archived budgets in warning or exceeded. Does not change
 * domain thresholds (80% / 100%) — only aggregates progress.status.
 */

import type { BudgetStatus } from "./types";

export type BudgetNavSignal = {
  /** Non-archived budgets in warning or exceeded. */
  atRisk: number;
  /** Non-archived budgets in exceeded. */
  exceeded: number;
};

type BudgetNavCandidate = {
  isArchived: boolean;
  progress: { status: BudgetStatus };
};

/**
 * Single-pass summary for sidebar badge severity.
 * `atRisk` includes both warning and exceeded; `exceeded` is the critical subset.
 */
export function summarizeBudgetNavSignal(
  budgets: readonly BudgetNavCandidate[],
): BudgetNavSignal {
  let atRisk = 0;
  let exceeded = 0;

  for (const b of budgets) {
    if (b.isArchived) continue;
    const status = b.progress.status;
    if (status === "exceeded") {
      atRisk += 1;
      exceeded += 1;
    } else if (status === "warning") {
      atRisk += 1;
    }
  }

  return { atRisk, exceeded };
}
