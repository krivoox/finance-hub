import type { TransactionType } from "./types";

/**
 * Signed cents for ledger display.
 *
 * Transfers are not cashflow (KRI-34): they keep the stored positive amount
 * so the UI does not paint them as expenses.
 */
export function signedLedgerAmountCents(
  type: TransactionType,
  amountCents: number,
): number {
  if (
    type === "income" ||
    type === "fx_credit" ||
    type === "adjustment_credit"
  ) {
    return amountCents;
  }
  if (
    type === "expense" ||
    type === "fx_debit" ||
    type === "adjustment_debit"
  ) {
    return -amountCents;
  }
  return amountCents;
}
