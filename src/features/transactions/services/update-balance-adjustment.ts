import "server-only";
import { prisma } from "@/lib/prisma";
import {
  calculateAccountBalance,
  type AccountType,
  type BalanceEffectTx,
} from "@/features/accounts/domain";
import {
  assertCanMutateTransactions,
  isAdjustmentType,
  planCreateBalanceAdjustment,
  TransactionDomainError,
  TransactionNotFoundError,
  type TransactionType,
} from "@/features/transactions/domain";
import { parseOccurredOn } from "./utils";
import {
  requireTransactionMembership,
  TRANSACTION_SELECT,
  type TransactionRecord,
} from "./require-transaction-membership";

export type UpdateBalanceAdjustmentServiceInput = {
  userId: string;
  transactionId: string;
  targetBalanceCents: number;
  occurredOn?: string;
  description?: string | null;
};

/**
 * SPEC-22 T-23 — Re-aim the target. Delta is computed against the derived
 * balance **excluding this adjustment**.
 */
export async function updateBalanceAdjustment(
  input: UpdateBalanceAdjustmentServiceInput,
): Promise<TransactionRecord> {
  const { transaction, membership } = await requireTransactionMembership(
    input.userId,
    input.transactionId,
  );
  assertCanMutateTransactions(membership.role);

  if (!isAdjustmentType(transaction.type)) {
    throw new TransactionNotFoundError(transaction.id);
  }

  const [account, user, remainingRows] = await Promise.all([
    prisma.financeAccount.findUnique({
      where: { id: transaction.accountId },
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
    prisma.transaction.findMany({
      where: {
        id: { not: transaction.id },
        OR: [
          { accountId: transaction.accountId },
          { counterpartyAccountId: transaction.accountId },
        ],
      },
      select: {
        type: true,
        amountCents: true,
        accountId: true,
        counterpartyAccountId: true,
      },
    }),
  ]);

  if (!account) {
    throw new TransactionDomainError("La cuenta indicada no existe");
  }

  const remainingEffects: BalanceEffectTx[] = remainingRows.map((row) => ({
    type: row.type as TransactionType,
    amountCents: row.amountCents,
    accountId: row.accountId,
    counterpartyAccountId: row.counterpartyAccountId,
  }));

  const current = calculateAccountBalance(
    {
      id: account.id,
      type: account.type as AccountType,
      currency: account.currency,
      initialBalanceCents: account.initialBalanceCents,
    },
    remainingEffects,
  );

  const nextOccurredOn =
    input.occurredOn !== undefined
      ? parseOccurredOn(input.occurredOn)
      : transaction.occurredOn;

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
    occurredOn: nextOccurredOn,
    now: new Date(),
    timezone: user?.timezone ?? "America/Argentina/Buenos_Aires",
    description:
      input.description !== undefined
        ? input.description
        : transaction.description,
    workspaceId: membership.workspaceId,
  });

  const updated = await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      type: snapshot.type,
      amountCents: snapshot.amountCents,
      occurredOn: snapshot.occurredOn,
      description: snapshot.description,
      currency: snapshot.currency,
      categoryId: null,
      counterpartyAccountId: null,
    },
    select: TRANSACTION_SELECT,
  });

  return {
    ...updated,
    type: updated.type as TransactionRecord["type"],
  };
}
