import "server-only";
import { prisma } from "@/lib/prisma";
import {
  allocateEqual,
  allocateExact,
  allocatePercentage,
  assertCanCreateExpenseSplit,
  type SplitMethod,
} from "@/features/splits/domain";
import {
  assertAccountActive,
  assertAccountBelongsToWorkspace,
  assertCanMutateTransactions,
  assertCategoryKindMatches,
  assertCategoryRequiredForType,
  assertOccurredOnNotTooFuture,
  assertTransactionCurrencyMatchesAccount,
  assertTransferCounterparty,
  assertValidAmount,
  normalizeDescription,
  TransactionDomainError,
} from "@/features/transactions/domain";
import type { CategoryKind } from "@/features/categories/domain";
import { requireMembership } from "@/features/workspaces/services";
import { parseOccurredOn } from "@/features/transactions/services/utils";
import {
  TRANSACTION_SELECT,
  type TransactionRecord,
} from "@/features/transactions/services/require-transaction-membership";
import { loadSplitGroupForUser } from "./require-split-group-access";
import { toMemberRef } from "./member-map";

type SplitEqual = { method: "equal" };
type SplitPercentage = {
  method: "percentage";
  percentages: { memberId: string; percent: number }[];
};
type SplitExact = {
  method: "exact";
  exactShares: { memberId: string; cents: number }[];
};

export type CreateExpenseWithSplitInput = {
  userId: string;
  workspaceId: string;
  splitGroupId: string;
  accountId: string;
  categoryId: string;
  amountCents: number;
  occurredOn: string;
  description?: string | null;
  currency?: string;
} & (SplitEqual | SplitPercentage | SplitExact);

export async function createExpenseWithSplit(
  input: CreateExpenseWithSplitInput,
): Promise<{ transaction: TransactionRecord; splitId: string }> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateTransactions(role);

  const { group } = await loadSplitGroupForUser(input.userId, input.splitGroupId);
  const members = group.members.map(toMemberRef);
  const currentMemberIds = members.map((m) => m.memberId);

  const shareMemberIds =
    input.method === "equal"
      ? currentMemberIds
      : input.method === "percentage"
        ? input.percentages.map((p) => p.memberId)
        : input.exactShares.map((s) => s.memberId);

  const { paidByMemberId } = assertCanCreateExpenseSplit({
    group: { currency: group.currency, workspaceId: group.workspaceId },
    currentMembers: members,
    registrarUserId: input.userId,
    registrarPersonalWorkspaceId: input.workspaceId,
    expense: {
      type: "expense",
      amountCents: input.amountCents,
      currency: input.currency ?? group.currency,
      workspaceId: input.workspaceId,
    },
    method: input.method,
    shareMemberIds,
  });

  assertValidAmount(input.amountCents);
  assertCategoryRequiredForType("expense", input.categoryId);
  assertTransferCounterparty("expense", null);

  const [account, category, user] = await Promise.all([
    prisma.financeAccount.findUnique({
      where: { id: input.accountId },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
      },
    }),
    prisma.category.findUnique({
      where: { id: input.categoryId },
      select: {
        id: true,
        workspaceId: true,
        kind: true,
        isArchived: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { timezone: true },
    }),
  ]);

  if (!account) {
    throw new TransactionDomainError("La cuenta indicada no existe");
  }
  if (!category) {
    throw new TransactionDomainError("La categoría indicada no existe");
  }
  if (category.isArchived) {
    throw new TransactionDomainError("La categoría está archivada");
  }
  assertAccountBelongsToWorkspace(account.workspaceId, input.workspaceId);
  if (category.workspaceId !== input.workspaceId) {
    throw new TransactionDomainError(
      "La categoría no pertenece al workspace de la transacción",
    );
  }
  assertAccountActive(account.isArchived);
  assertCategoryKindMatches("expense", category.kind as CategoryKind);

  const occurredOn = parseOccurredOn(input.occurredOn);
  assertOccurredOnNotTooFuture(occurredOn, new Date(), user?.timezone);
  const description = normalizeDescription(input.description ?? null);
  assertTransactionCurrencyMatchesAccount(
    input.currency ?? account.currency,
    account.currency,
  );

  const shares =
    input.method === "equal"
      ? allocateEqual(input.amountCents, currentMemberIds)
      : input.method === "percentage"
        ? allocatePercentage(input.amountCents, input.percentages)
        : allocateExact(input.amountCents, input.exactShares);

  const method: SplitMethod = input.method;

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        workspaceId: input.workspaceId,
        type: "expense",
        amountCents: input.amountCents,
        currency: account.currency,
        occurredOn,
        description,
        categoryId: input.categoryId,
        accountId: input.accountId,
        counterpartyAccountId: null,
        createdByUserId: input.userId,
      },
      select: TRANSACTION_SELECT,
    });

    const split = await tx.expenseSplit.create({
      data: {
        splitGroupId: group.id,
        expenseTransactionId: transaction.id,
        paidByMemberId,
        method,
        shares: {
          create: shares.map((s) => ({
            memberId: s.memberId,
            shareCents: s.shareCents,
          })),
        },
      },
    });

    return { transaction, splitId: split.id };
  });

  return {
    transaction: {
      ...result.transaction,
      type: result.transaction.type as TransactionRecord["type"],
    },
    splitId: result.splitId,
  };
}
