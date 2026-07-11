import "server-only";
import { prisma } from "@/lib/prisma";
import type { BalanceEffectTx } from "@/features/accounts/domain";
import type { TransactionType } from "@/features/transactions/domain";

/**
 * Loads every transaction in a workspace that could affect an account balance
 * and projects it into the pure `BalanceEffectTx` shape consumed by
 * `calculateAccountBalance`. Used by `listAccounts` / `getAccount` to derive
 * `currentBalance` (SPEC-03 §5).
 *
 * Only the fields required for balance derivation are selected.
 */
export async function loadWorkspaceBalanceEffects(
  workspaceId: string,
): Promise<BalanceEffectTx[]> {
  const rows = await prisma.transaction.findMany({
    where: { workspaceId },
    select: {
      type: true,
      amountCents: true,
      accountId: true,
      counterpartyAccountId: true,
    },
  });
  return rows.map((r) => ({
    type: r.type as TransactionType,
    amountCents: r.amountCents,
    accountId: r.accountId,
    counterpartyAccountId: r.counterpartyAccountId,
  }));
}

/**
 * Same idea, scoped to a single account (origin or counterparty). Used by
 * `getAccount` to avoid pulling the full workspace ledger.
 */
export async function loadAccountBalanceEffects(
  accountId: string,
): Promise<BalanceEffectTx[]> {
  const rows = await prisma.transaction.findMany({
    where: {
      OR: [{ accountId }, { counterpartyAccountId: accountId }],
    },
    select: {
      type: true,
      amountCents: true,
      accountId: true,
      counterpartyAccountId: true,
    },
  });
  return rows.map((r) => ({
    type: r.type as TransactionType,
    amountCents: r.amountCents,
    accountId: r.accountId,
    counterpartyAccountId: r.counterpartyAccountId,
  }));
}
