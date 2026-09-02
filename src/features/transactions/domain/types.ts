/**
 * Pure domain types for the Transactions feature (SPEC-05 / SPEC-06).
 *
 * The persistence layer (Prisma) is intentionally not imported here so that
 * the domain runs in the browser and in Vitest with no database.
 */

import type { CategoryKind } from "@/features/categories/domain";
import {
  isAdjustmentLedgerType,
  type AdjustmentLedgerType,
} from "@/features/accounts/domain";

/** Types selectable when creating a regular ledger movement (UI forms). */
export const CREATEABLE_TRANSACTION_TYPES = [
  "income",
  "expense",
  "transfer",
] as const;

export type CreateableTransactionType =
  (typeof CREATEABLE_TRANSACTION_TYPES)[number];

/**
 * UI-only kinds for the create form, including the Ajuste tab (SPEC-22).
 * Adjustment is not a persistable `type` — the command sends a target balance.
 */
export const NEW_TRANSACTION_FORM_TYPES = [
  "expense",
  "income",
  "transfer",
  "adjustment",
] as const;

export type NewTransactionFormType =
  (typeof NEW_TRANSACTION_FORM_TYPES)[number];

export const TRANSACTION_TYPES = [
  "income",
  "expense",
  "transfer",
  "fx_debit",
  "fx_credit",
  "adjustment_credit",
  "adjustment_debit",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export function isTransactionType(value: unknown): value is TransactionType {
  return (
    typeof value === "string" &&
    (TRANSACTION_TYPES as readonly string[]).includes(value)
  );
}

export function isAdjustmentType(
  type: TransactionType,
): type is AdjustmentLedgerType {
  return isAdjustmentLedgerType(type);
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
  fx_debit: null,
  fx_credit: null,
  adjustment_credit: null,
  adjustment_debit: null,
};
