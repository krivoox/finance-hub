import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  calculateAccountBalance,
  type AccountType,
} from "@/features/accounts/domain";
import {
  assertCanMutateTransactions,
  planCreateBalanceAdjustment,
  TransactionDomainError,
} from "@/features/transactions/domain";
import { parseOccurredOn } from "./utils";
import { loadAccountBalanceEffects } from "./list-transactions-for-balances";
import {
  TRANSACTION_SELECT,
  type TransactionRecord,
} from "./require-transaction-membership";

export type CreateBalanceAdjustmentServiceInput = {
  userId: string;
  workspaceId: string;
  accountId: string;
  targetBalanceCents: number;
  occurredOn: string;
  description?: string | null;
  currency?: string;
};

/**
 * SPEC-22 FR-01 — Persist a ledger adjustment so derived balance equals target.
 */
export async function createBalanceAdjustment(
  input: CreateBalanceAdjustmentServiceInput,
): Promise<TransactionRecord & { signedEffect: number }> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateTransactions(role);

  const [account, user, effects] = await Promise.all([
    prisma.financeAccount.findUnique({
      where: { id: input.accountId },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
        type: true,
        initialBalanceCents: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { timezone: true },
    }),
    loadAccountBalanceEffects(input.accountId),
  ]);

  if (!account) {
    throw new TransactionDomainError("La cuenta indicada no existe");
  }

  const current = calculateAccountBalance(
    {
      id: account.id,
      type: account.type as AccountType,
      currency: account.currency,
      initialBalanceCents: account.initialBalanceCents,
    },
    effects,
  );

  const snapshot = planCreateBalanceAdjustment({
    account: {
      id: account.id,
      type: account.type as AccountType,
      currency: account.currency,
      isArchived: account.isArchived,
      workspaceId: account.workspaceId,
    },
    currentBalanceCents: current.amountCents,
    targetBalanceCents: input.targetBalanceCents,
    occurredOn: parseOccurredOn(input.occurredOn),
    now: new Date(),
    timezone: user?.timezone ?? "America/Argentina/Buenos_Aires",
    description: input.description,
    currency: input.currency,
    workspaceId: input.workspaceId,
  });

  const created = await prisma.transaction.create({
    data: {
      workspaceId: input.workspaceId,
      type: snapshot.type,
      amountCents: snapshot.amountCents,
      currency: snapshot.currency,
      occurredOn: snapshot.occurredOn,
      description: snapshot.description,
      categoryId: null,
      accountId: snapshot.accountId,
      counterpartyAccountId: null,
      createdByUserId: input.userId,
    },
    select: TRANSACTION_SELECT,
  });

  return {
    ...created,
    type: created.type as TransactionRecord["type"],
    signedEffect: snapshot.signedEffect,
  };
}
