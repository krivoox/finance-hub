import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanReadTransactions,
  type TransactionType,
} from "@/features/transactions/domain";
import { requireTransactionMembership } from "./require-transaction-membership";

export type TransactionSplitShareDetail = {
  memberId: string;
  shareCents: number;
  displayName: string;
};

export type TransactionSplitDetail = {
  id: string;
  splitGroupId: string;
  splitGroupName: string;
  paidByMemberId: string;
  paidByDisplayName: string;
  method: string;
  shares: TransactionSplitShareDetail[];
};

export type GoalContributionDetail = {
  contributionId: string;
  goalId: string;
  goalName: string;
  goalKind: "save" | "debt_payoff";
};

export type TransactionDetail = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  type: TransactionType;
  amountCents: number;
  currency: string;
  occurredOn: Date;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  accountId: string;
  accountName: string;
  counterpartyAccountId: string | null;
  counterpartyAccountName: string | null;
  createdByUserId: string;
  createdByDisplayName: string;
  createdAt: Date;
  updatedAt: Date;
  split: TransactionSplitDetail | null;
  goalContribution: GoalContributionDetail | null;
};

function displayName(user: {
  displayName: string | null;
  name: string;
  email: string;
}): string {
  return user.displayName?.trim() || user.name || user.email;
}

/**
 * SPEC-13 — Enriched transaction for the detail page.
 */
export async function getTransactionDetail({
  userId,
  transactionId,
}: {
  userId: string;
  transactionId: string;
}): Promise<TransactionDetail> {
  const { membership } = await requireTransactionMembership(
    userId,
    transactionId,
  );
  assertCanReadTransactions(membership.role);

  const row = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      workspaceId: true,
      type: true,
      amountCents: true,
      currency: true,
      occurredOn: true,
      description: true,
      categoryId: true,
      accountId: true,
      counterpartyAccountId: true,
      createdByUserId: true,
      createdAt: true,
      updatedAt: true,
      workspace: { select: { name: true } },
      category: { select: { name: true } },
      account: { select: { name: true } },
      counterpartyAccount: { select: { name: true } },
      expenseSplit: {
        select: {
          id: true,
          splitGroupId: true,
          paidByMemberId: true,
          method: true,
          splitGroup: { select: { name: true } },
          paidBy: { select: { displayName: true } },
          shares: {
            select: {
              memberId: true,
              shareCents: true,
              member: { select: { displayName: true } },
            },
          },
        },
      },
      goalContribution: {
        select: {
          id: true,
          goalId: true,
          goal: { select: { name: true, kind: true } },
        },
      },
    },
  });

  if (!row) {
    const { TransactionNotFoundError } = await import(
      "@/features/transactions/domain"
    );
    throw new TransactionNotFoundError(transactionId);
  }

  const creator = await prisma.user.findUnique({
    where: { id: row.createdByUserId },
    select: { id: true, name: true, displayName: true, email: true },
  });

  const split: TransactionSplitDetail | null = row.expenseSplit
    ? {
        id: row.expenseSplit.id,
        splitGroupId: row.expenseSplit.splitGroupId,
        splitGroupName: row.expenseSplit.splitGroup.name,
        paidByMemberId: row.expenseSplit.paidByMemberId,
        paidByDisplayName: row.expenseSplit.paidBy.displayName,
        method: row.expenseSplit.method,
        shares: row.expenseSplit.shares.map((s) => ({
          memberId: s.memberId,
          shareCents: s.shareCents,
          displayName: s.member.displayName,
        })),
      }
    : null;

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    workspaceName: row.workspace.name,
    type: row.type as TransactionType,
    amountCents: row.amountCents,
    currency: row.currency,
    occurredOn: row.occurredOn,
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    accountId: row.accountId,
    accountName: row.account.name,
    counterpartyAccountId: row.counterpartyAccountId,
    counterpartyAccountName: row.counterpartyAccount?.name ?? null,
    createdByUserId: row.createdByUserId,
    createdByDisplayName: creator ? displayName(creator) : row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    split,
    goalContribution: row.goalContribution
      ? {
          contributionId: row.goalContribution.id,
          goalId: row.goalContribution.goalId,
          goalName: row.goalContribution.goal.name,
          goalKind: row.goalContribution.goal.kind as "save" | "debt_payoff",
        }
      : null,
  };
}
