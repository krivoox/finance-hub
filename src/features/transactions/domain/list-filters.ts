/**
 * SPEC-05 FR-04 — Type / account / category filter predicates for the list.
 */

import type { TransactionLike, TransactionType } from "./types";

export const LIST_TYPE_FILTERS = [
  "all",
  "income",
  "expense",
  "transfer",
] as const;

export type ListTypeFilter = (typeof LIST_TYPE_FILTERS)[number];

export function isListTypeFilter(value: string): value is ListTypeFilter {
  return (LIST_TYPE_FILTERS as readonly string[]).includes(value);
}

/** Absent or unknown type URL value → `all` (SPEC-05 T-19). */
export function normalizeListTypeFilter(
  type?: string | null,
): ListTypeFilter {
  if (type && isListTypeFilter(type)) return type;
  return "all";
}

/**
 * Map UI type filter to Prisma `type` values.
 * `undefined` = no type predicate (includes `fx_*`).
 * `transfer` does **not** include `fx_*` (SPEC-05 T-16).
 */
export function resolveListTypeFilter(
  type?: string | null,
): TransactionType[] | undefined {
  const normalized = normalizeListTypeFilter(type);
  switch (normalized) {
    case "income":
      return ["income"];
    case "expense":
      return ["expense"];
    case "transfer":
      return ["transfer"];
    case "all":
    default:
      return undefined;
  }
}

export function matchesTypeFilter(
  tx: Pick<TransactionLike, "type">,
  types: TransactionType[] | undefined,
): boolean {
  if (!types) return true;
  return types.includes(tx.type);
}

/**
 * Match if the account is origin or destination (covers transfers / fx legs).
 */
export function matchesAccountFilter(
  tx: Pick<TransactionLike, "accountId" | "counterpartyAccountId">,
  accountId: string,
): boolean {
  return (
    tx.accountId === accountId || tx.counterpartyAccountId === accountId
  );
}

/**
 * Exact category match. Transfers / `fx_*` have `categoryId = null` → excluded.
 */
export function matchesCategoryFilter(
  tx: Pick<TransactionLike, "categoryId">,
  categoryId: string,
): boolean {
  return tx.categoryId === categoryId;
}
