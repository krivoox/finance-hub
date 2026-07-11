/**
 * Pure domain types for the Transactions feature (SPEC-05 / SPEC-06).
 *
 * The persistence layer (Prisma) is intentionally not imported here so that
 * the domain runs in the browser and in Vitest with no database.
 */

import type { CategoryKind } from "@/features/categories/domain";

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export function isTransactionType(value: unknown): value is TransactionType {
  return (
    typeof value === "string" &&
    (TRANSACTION_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Minimal domain view of a persisted transaction — everything the domain
 * needs to derive balances, sort lists and re-check invariants on updates.
 */
export type TransactionLike = {
  readonly id: string;
  readonly workspaceId: string;
  readonly type: TransactionType;
  readonly amountCents: number;
  readonly currency: string;
  readonly occurredOn: Date;
  readonly description: string | null;
  readonly categoryId: string | null;
  readonly accountId: string;
  readonly counterpartyAccountId: string | null;
  readonly createdByUserId: string;
  readonly createdAt: Date;
};

export const TRANSACTION_DESCRIPTION_MAX_LENGTH = 240;

/**
 * Mapping of expected category kind per transaction type (SPEC-05 §4).
 * Transfers do not carry a category.
 */
export const TRANSACTION_TYPE_TO_CATEGORY_KIND: Record<
  TransactionType,
  CategoryKind | null
> = {
  income: "income",
  expense: "expense",
  transfer: null,
};
