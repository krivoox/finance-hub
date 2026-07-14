import "server-only";
import { prisma } from "@/lib/prisma";
import { createExpense } from "@/features/transactions/services/create-expense";
import type { TransactionRecord } from "@/features/transactions/services/require-transaction-membership";
import { attachSplitToExpense } from "./attach-split";

type SplitEqual = {
  method: "equal";
  participantUserIds: string[];
};
type SplitPercentage = {
  method: "percentage";
  percentages: { userId: string; percent: number }[];
};
type SplitExact = {
  method: "exact";
  exactShares: { userId: string; cents: number }[];
};

export type CreateExpenseWithSplitInput = {
  userId: string;
  workspaceId: string;
  accountId: string;
  categoryId: string;
  amountCents: number;
  occurredOn: string;
  description?: string | null;
  paidByUserId: string;
} & (SplitEqual | SplitPercentage | SplitExact);

/**
 * SPEC-10 FR-01 — Create an expense and attach a split in one flow.
 * If the split fails, the expense is rolled back so the ledger stays clean.
 */
export async function createExpenseWithSplit(
  input: CreateExpenseWithSplitInput,
): Promise<{ transaction: TransactionRecord; splitId: string }> {
  const transaction = await createExpense({
    userId: input.userId,
    workspaceId: input.workspaceId,
    accountId: input.accountId,
    categoryId: input.categoryId,
    amountCents: input.amountCents,
    occurredOn: input.occurredOn,
    description: input.description,
  });

  const base = {
    userId: input.userId,
    workspaceId: input.workspaceId,
    expenseTransactionId: transaction.id,
    paidByUserId: input.paidByUserId,
  };

  try {
    const split =
      input.method === "equal"
        ? await attachSplitToExpense({
            ...base,
            method: "equal",
            participantUserIds: input.participantUserIds,
          })
        : input.method === "percentage"
          ? await attachSplitToExpense({
              ...base,
              method: "percentage",
              percentages: input.percentages,
            })
          : await attachSplitToExpense({
              ...base,
              method: "exact",
              exactShares: input.exactShares,
            });

    return { transaction, splitId: split.id };
  } catch (err) {
    await prisma.transaction.delete({ where: { id: transaction.id } });
    throw err;
  }
}
