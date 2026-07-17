/**
 * SPEC-12 / ADR-006 — Native balances grouped by currency.
 *
 * Never mixes ARS and USD into one number. Credit cards subtract (debt).
 */

import type { DashboardAccount } from "./types";
import type { TotalBalance } from "./types";

export type BalancesByCurrency = ReadonlyMap<string, TotalBalance>;

export function computeBalancesByCurrency(
  accounts: readonly DashboardAccount[],
): BalancesByCurrency {
  const totals = new Map<string, number>();

  for (const account of accounts) {
    if (account.isArchived) continue;

    const currency = account.currentBalance.currency;
    const balance = account.currentBalance.amountCents;
    const signed =
      account.type === "credit_card" ? -balance : balance;

    totals.set(currency, (totals.get(currency) ?? 0) + signed);
  }

  const result = new Map<string, TotalBalance>();
  for (const [currency, amountCents] of totals) {
    result.set(currency, { amountCents, currency });
  }
  return result;
}

/** Stable ordered entries for UI (ARS first, then USD, then alpha). */
export function balancesByCurrencyEntries(
  balances: BalancesByCurrency,
): TotalBalance[] {
  return [...balances.values()].sort((a, b) => {
    if (a.currency === "ARS") return -1;
    if (b.currency === "ARS") return 1;
    if (a.currency === "USD") return -1;
    if (b.currency === "USD") return 1;
    return a.currency.localeCompare(b.currency);
  });
}
