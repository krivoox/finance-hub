import "server-only";
import { prisma } from "@/lib/prisma";
import type { BalanceEffectTx } from "@/features/accounts/domain";
import type { TransactionType } from "@/features/transactions/domain";

/**
 * Loads every transaction that can affect account balances **of accounts that
 * belong to this workspace** — including externally funded txs whose
 * `transaction.workspaceId` is another space (SPEC-14).
 *
 * Also includes classic same-workspace transfers (counterparty in this WS).
 */
export async function loadWorkspaceBalanceEffects(
  workspaceId: string,
): Promise<BalanceEffectTx[]> {
  const accountIds = (
    await prisma.financeAccount.findMany({
      where: { workspaceId },
      select: { id: true },
    })
  ).map((a) => a.id);

  if (accountIds.length === 0) return [];

  const rows = await prisma.transaction.findMany({
    where: {
      OR: [
        { accountId: { in: accountIds } },
        { counterpartyAccountId: { in: accountIds } },
      ],
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
