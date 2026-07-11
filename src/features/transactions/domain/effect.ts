/**
 * Bridge between the persistence-shape transaction and the pure
 * `BalanceEffectTx` consumed by `calculateAccountBalance` (SPEC-03 §5).
 *
 * Kept in the transactions domain because the shape of a Transaction is a
 * transactions concern; the accounts domain only cares about the effect.
 */

import type { BalanceEffectTx } from "@/features/accounts/domain";
import type { TransactionLike } from "./types";

export function toBalanceEffect(tx: TransactionLike): BalanceEffectTx {
  return {
    type: tx.type,
    amountCents: tx.amountCents,
    accountId: tx.accountId,
    counterpartyAccountId: tx.counterpartyAccountId,
  };
}

export function toBalanceEffects(
  txs: readonly TransactionLike[],
): BalanceEffectTx[] {
  return txs.map(toBalanceEffect);
}
