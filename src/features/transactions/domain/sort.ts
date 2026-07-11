/**
 * SPEC-05 §6 — Listings are ordered by `occurredOn` desc, then `createdAt` desc.
 * Pure and stable (returns a new array; input is not mutated).
 */

import type { TransactionLike } from "./types";

export function sortTransactionsForList<T extends TransactionLike>(
  txs: readonly T[],
): T[] {
  return [...txs].sort((a, b) => {
    const occurredDiff = b.occurredOn.getTime() - a.occurredOn.getTime();
    if (occurredDiff !== 0) return occurredDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
