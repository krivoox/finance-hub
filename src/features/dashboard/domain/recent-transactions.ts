/**
 * SPEC-12 §4 — "Recent transactions" selector for the dashboard.
 *
 * Sorts by `occurredOn` desc, tie-breaks by `createdAt` desc (same order used
 * in the transactions listing, SPEC-05 §6) and takes the first N entries.
 *
 * Pure and immutable: the input array is not mutated.
 */

import type { DashboardTransaction } from "./types";

export function selectRecentTransactions<T extends DashboardTransaction>(
  transactions: readonly T[],
  limit: number,
): T[] {
  if (limit <= 0) return [];

  return [...transactions]
    .sort((a, b) => {
      const occurredDiff = b.occurredOn.getTime() - a.occurredOn.getTime();
      if (occurredDiff !== 0) return occurredDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, limit);
}
