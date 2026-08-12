/**
 * Transaction form currency helpers (SPEC-05 FR-05 / FR-07 / KRI-10).
 *
 * Pure: no Prisma / React. Used by UI to default + filter accounts, and by
 * services when the client sends an explicit `currency` to assert against
 * the selected account.
 */

import {
  ACCOUNT_CURRENCIES,
  type AccountCurrency,
  isAccountCurrency,
} from "@/domain/money/currencies";

export type AccountCurrencyOption = {
  readonly id: string;
  readonly currency: string;
};

export type PaymentAccountGroupLike<T extends AccountCurrencyOption> = {
  readonly workspaceId: string;
  readonly accounts: readonly T[];
};

/**
 * SPEC-05 T-22 — Default form currency is workspace `baseCurrency` when the
 * selection is missing or not in ACCOUNT_CURRENCIES.
 */
export function resolveTransactionFormCurrency(input: {
  selected?: string | null;
  workspaceBaseCurrency: string;
}): AccountCurrency {
  if (input.selected && isAccountCurrency(input.selected)) {
    return input.selected;
  }
  if (isAccountCurrency(input.workspaceBaseCurrency)) {
    return input.workspaceBaseCurrency;
  }
  return "ARS";
}

/**
 * SPEC-05 T-23 — Accounts shown for create must match the selected currency
 * (no mixing ARS txs onto USD accounts and vice versa).
 */
export function filterAccountsByCurrency<T extends AccountCurrencyOption>(
  accounts: readonly T[],
  currency: string,
): T[] {
  return accounts.filter((a) => a.currency === currency);
}

/**
 * Same rule for SPEC-14 payment groups: drop empty groups after filtering.
 * Preserves extra group fields (name, type, …) via the generic.
 */
export function filterPaymentGroupsByCurrency<
  TAccount extends AccountCurrencyOption,
  TGroup extends PaymentAccountGroupLike<TAccount>,
>(groups: readonly TGroup[], currency: string): TGroup[] {
  return groups
    .map((g) => ({
      ...g,
      accounts: filterAccountsByCurrency(g.accounts, currency),
    }))
    .filter((g) => g.accounts.length > 0) as TGroup[];
}

/** Currencies present among accounts (stable order: ACCOUNT_CURRENCIES). */
export function currenciesPresentInAccounts(
  accounts: readonly AccountCurrencyOption[],
): AccountCurrency[] {
  const present = new Set(
    accounts.map((a) => a.currency).filter(isAccountCurrency),
  );
  return ACCOUNT_CURRENCIES.filter((c) => present.has(c));
}
