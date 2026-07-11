/**
 * Balance derivation (SPEC-03 §5, FR-03).
 *
 * Pure function: given an account and the transactions that touch it, return
 * the derived current balance.
 *
 * Regular accounts (checking / savings / cash / virtual_wallet / other):
 *   - `income`   on the account  → +amount
 *   - `expense`  on the account  → −amount
 *   - `transfer` where the account is the source      → −amount
 *   - `transfer` where the account is the destination → +amount
 *
 * Credit cards (SPEC-03 §5, T-05): the balance represents the amount owed,
 * so the polarity of every effect is inverted:
 *   - `expense`  on the card              → +amount  (more debt)
 *   - `income`   on the card              → −amount  (payment / credit reduces debt)
 *   - `transfer` where the card is source → +amount  (cash advance → more debt)
 *   - `transfer` where the card is dest.  → −amount  (payment from another account)
 */

import type { AccountBalance, AccountType } from "./types";

export type AccountForBalance = {
  readonly id: string;
  readonly type: AccountType;
  readonly currency: string;
  readonly initialBalanceCents: number;
};

export type BalanceEffectTx = {
  readonly type: "income" | "expense" | "transfer";
  readonly amountCents: number;
  readonly accountId: string;
  readonly counterpartyAccountId?: string | null;
};

export function calculateAccountBalance(
  account: AccountForBalance,
  transactions: readonly BalanceEffectTx[],
): AccountBalance {
  const isCredit = account.type === "credit_card";
  let amountCents = account.initialBalanceCents;

  for (const tx of transactions) {
    const isSource = tx.accountId === account.id;
    const isDestination =
      tx.type === "transfer" && tx.counterpartyAccountId === account.id;

    if (!isSource && !isDestination) continue;

    amountCents += signedDelta(tx, { isSource, isDestination, isCredit });
  }

  return { amountCents, currency: account.currency };
}

function signedDelta(
  tx: BalanceEffectTx,
  ctx: { isSource: boolean; isDestination: boolean; isCredit: boolean },
): number {
  const { isSource, isDestination, isCredit } = ctx;

  if (tx.type === "transfer") {
    if (isSource) return isCredit ? tx.amountCents : -tx.amountCents;
    if (isDestination) return isCredit ? -tx.amountCents : tx.amountCents;
    return 0;
  }

  if (!isSource) return 0;

  if (tx.type === "income") {
    return isCredit ? -tx.amountCents : tx.amountCents;
  }

  // expense
  return isCredit ? tx.amountCents : -tx.amountCents;
}
