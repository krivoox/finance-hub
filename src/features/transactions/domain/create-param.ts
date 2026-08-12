import type { CreateableTransactionType } from "./types";

/** Query values that open the global create sheet (`?new=`). */
export const TRANSACTION_CREATE_PARAMS = [
  "1",
  "transaction",
  "expense",
  "income",
] as const;

export type TransactionCreateParam = (typeof TRANSACTION_CREATE_PARAMS)[number];

export function isTransactionCreateParam(
  value: string | null | undefined,
): value is TransactionCreateParam {
  if (!value) return false;
  return (TRANSACTION_CREATE_PARAMS as readonly string[]).includes(value);
}

/**
 * Map `?new=` to an initial createable type for the form.
 * `1` / `transaction` → expense (default happy path).
 */
export function initialTypeFromCreateParam(
  value: string | null | undefined,
): CreateableTransactionType {
  if (value === "income") return "income";
  return "expense";
}
