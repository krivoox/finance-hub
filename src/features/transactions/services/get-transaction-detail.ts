import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanReadTransactions,
  type TransactionType,
} from "@/features/transactions/domain";
import { requireTransactionMembership } from "./require-transaction-membership";

export type TransactionSplitShareDetail = {
  userId: string;
  shareCents: number;
  displayName: string;
};

export type TransactionSplitDetail = {
  id: string;
  paidByUserId: string;
  paidByDisplayName: string;
  method: string;
  shares: TransactionSplitShareDetail[];
};

export type CrossWorkspaceLinkDetail = {
  id: string;
  kind: "contribution" | "externally_funded_expense";
  twinTransactionId: string;
  twinWorkspaceId: string;
  twinWorkspaceName: string;
  role: "source" | "target";
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
  accountWorkspaceId: string;
  accountWorkspaceName: string;
  accountWorkspaceType: "personal" | "group";
  counterpartyAccountId: string | null;
  counterpartyAccountName: string | null;
  createdByUserId: string;
  createdByDisplayName: string;
  createdAt: Date;
  updatedAt: Date;
  /** True when the payment account lives in another workspace than the tx. */
  isExternallyFunded: boolean;
  split: TransactionSplitDetail | null;
  crossWorkspaceLink: CrossWorkspaceLinkDetail | null;
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
      account: {
        select: {
          name: true,
          workspaceId: true,
          workspace: { select: { name: true, type: true } },
        },
      },
      counterpartyAccount: { select: { name: true } },
      expenseSplit: {
        select: {
          id: true,
          paidByUserId: true,
          method: true,
          shares: { select: { userId: true, shareCents: true } },
        },
      },
      crossWorkspaceLinkAsSource: {
        select: {
          id: true,
          kind: true,
          targetTransactionId: true,
          targetTransaction: {
            select: {
              workspaceId: true,
              workspace: { select: { name: true } },
            },
          },
        },
      },
      crossWorkspaceLinkAsTarget: {
        select: {
          id: true,
          kind: true,
          sourceTransactionId: true,
          sourceTransaction: {
            select: {
              workspaceId: true,
              workspace: { select: { name: true } },
            },
          },
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

  const userIds = new Set<string>([row.createdByUserId]);
  if (row.expenseSplit) {
    userIds.add(row.expenseSplit.paidByUserId);
    for (const s of row.expenseSplit.shares) userIds.add(s.userId);
  }
  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, name: true, displayName: true, email: true },
  });
  const nameById = new Map(users.map((u) => [u.id, displayName(u)]));

  let crossWorkspaceLink: CrossWorkspaceLinkDetail | null = null;
  if (row.crossWorkspaceLinkAsSource) {
    const link = row.crossWorkspaceLinkAsSource;
    crossWorkspaceLink = {
      id: link.id,
      kind: link.kind as CrossWorkspaceLinkDetail["kind"],
      twinTransactionId: link.targetTransactionId,
      twinWorkspaceId: link.targetTransaction.workspaceId,
      twinWorkspaceName: link.targetTransaction.workspace.name,
      role: "source",
    };
  } else if (row.crossWorkspaceLinkAsTarget) {
    const link = row.crossWorkspaceLinkAsTarget;
    crossWorkspaceLink = {
      id: link.id,
      kind: link.kind as CrossWorkspaceLinkDetail["kind"],
      twinTransactionId: link.sourceTransactionId,
      twinWorkspaceId: link.sourceTransaction.workspaceId,
      twinWorkspaceName: link.sourceTransaction.workspace.name,
      role: "target",
    };
  }

  const split: TransactionSplitDetail | null = row.expenseSplit
    ? {
        id: row.expenseSplit.id,
        paidByUserId: row.expenseSplit.paidByUserId,
        paidByDisplayName:
          nameById.get(row.expenseSplit.paidByUserId) ??
          row.expenseSplit.paidByUserId,
        method: row.expenseSplit.method,
        shares: row.expenseSplit.shares.map((s) => ({
          userId: s.userId,
          shareCents: s.shareCents,
          displayName: nameById.get(s.userId) ?? s.userId,
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
    accountWorkspaceId: row.account.workspaceId,
    accountWorkspaceName: row.account.workspace.name,
    accountWorkspaceType: row.account.workspace.type as "personal" | "group",
    counterpartyAccountId: row.counterpartyAccountId,
    counterpartyAccountName: row.counterpartyAccount?.name ?? null,
    createdByUserId: row.createdByUserId,
    createdByDisplayName:
      nameById.get(row.createdByUserId) ?? row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isExternallyFunded: row.account.workspaceId !== row.workspaceId,
    split,
    crossWorkspaceLink,
  };
}
