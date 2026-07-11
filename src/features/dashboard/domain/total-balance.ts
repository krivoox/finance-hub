/**
 * SPEC-12 §4 — Total balance (net worth) for a workspace.
 *
 * Rule (from SPEC-03 §5 balance convention):
 *   - Non-credit accounts (`checking`, `savings`, `cash`, `virtual_wallet`,
 *     `other`) hold assets → their `currentBalance` adds to net worth.
 *   - `credit_card` accounts hold debt (a positive balance means "amount
 *     owed") → their `currentBalance` subtracts from net worth.
 *
 * Archived accounts and accounts in a different currency than the requested
 * one are skipped. The return type is a signed `TotalBalance` (not `Money`)
 * because the aggregate can legitimately be negative.
 */

import type { DashboardAccount, TotalBalance } from "./types";

export function computeTotalBalance(
  accounts: readonly DashboardAccount[],
  currency: string,
): TotalBalance {
  let amountCents = 0;

  for (const account of accounts) {
    if (account.isArchived) continue;
    if (account.currentBalance.currency !== currency) continue;

    const balance = account.currentBalance.amountCents;
    if (account.type === "credit_card") {
      amountCents -= balance;
    } else {
      amountCents += balance;
    }
  }

  return { amountCents, currency };
}
