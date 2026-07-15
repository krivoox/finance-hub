import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanContribute,
  assertOccurredOnNotTooFuture,
  assertValidAmount,
  normalizeDescription,
  TransactionDomainError,
  type TransactionType,
} from "@/features/transactions/domain";
import { parseOccurredOn } from "./utils";
import {
  TRANSACTION_SELECT,
  type TransactionRecord,
} from "./require-transaction-membership";
import { ensureContributionCategories } from "./ensure-contribution-categories";

export type CreateCrossWorkspaceContributionInput = {
  userId: string;
  sourceAccountId: string;
  targetAccountId: string;
  amountCents: number;
  occurredOn: string;
  description?: string | null;
};

export type CrossWorkspaceContributionResult = {
  linkId: string;
  source: TransactionRecord;
  target: TransactionRecord;
};

/**
 * SPEC-14 FR-01 — Expense in source workspace + income in target + link.
 */
export async function createCrossWorkspaceContribution(
  input: CreateCrossWorkspaceContributionInput,
): Promise<CrossWorkspaceContributionResult> {
  assertValidAmount(input.amountCents);

  const [sourceAccount, targetAccount, user] = await Promise.all([
    prisma.financeAccount.findUnique({
      where: { id: input.sourceAccountId },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
      },
    }),
    prisma.financeAccount.findUnique({
      where: { id: input.targetAccountId },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { timezone: true },
    }),
  ]);

  if (!sourceAccount || !targetAccount) {
    throw new TransactionDomainError("La cuenta indicada no existe");
  }

  const [sourceMembership, targetMembership] = await Promise.all([
    prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: sourceAccount.workspaceId,
          userId: input.userId,
        },
      },
      select: { role: true, workspaceId: true },
    }),
    prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: targetAccount.workspaceId,
          userId: input.userId,
        },
      },
      select: { role: true, workspaceId: true },
    }),
  ]);

  assertCanContribute({
    source: sourceAccount,
    target: targetAccount,
    sourceMembership: sourceMembership
      ? {
          workspaceId: sourceMembership.workspaceId,
          role: sourceMembership.role,
        }
      : null,
    targetMembership: targetMembership
      ? {
          workspaceId: targetMembership.workspaceId,
          role: targetMembership.role,
        }
      : null,
  });

  const occurredOn = parseOccurredOn(input.occurredOn);
  assertOccurredOnNotTooFuture(occurredOn, new Date(), user?.timezone);
  const description = normalizeDescription(input.description ?? null);

  const [sourceCats, targetCats] = await Promise.all([
    ensureContributionCategories(sourceAccount.workspaceId),
    ensureContributionCategories(targetAccount.workspaceId),
  ]);

  const result = await prisma.$transaction(async (tx) => {
    const sourceTx = await tx.transaction.create({
      data: {
        workspaceId: sourceAccount.workspaceId,
        type: "expense",
        amountCents: input.amountCents,
        currency: sourceAccount.currency,
        occurredOn,
        description,
        categoryId: sourceCats.expenseCategoryId,
        accountId: sourceAccount.id,
        createdByUserId: input.userId,
      },
      select: TRANSACTION_SELECT,
    });

    const targetTx = await tx.transaction.create({
      data: {
        workspaceId: targetAccount.workspaceId,
        type: "income",
        amountCents: input.amountCents,
        currency: targetAccount.currency,
        occurredOn,
        description,
        categoryId: targetCats.incomeCategoryId,
        accountId: targetAccount.id,
        createdByUserId: input.userId,
      },
      select: TRANSACTION_SELECT,
    });

    const link = await tx.crossWorkspaceLink.create({
      data: {
        kind: "contribution",
        sourceTransactionId: sourceTx.id,
        targetTransactionId: targetTx.id,
      },
      select: { id: true },
    });

    return { linkId: link.id, sourceTx, targetTx };
  });

  return {
    linkId: result.linkId,
    source: {
      ...result.sourceTx,
      type: result.sourceTx.type as TransactionType,
    },
    target: {
      ...result.targetTx,
      type: result.targetTx.type as TransactionType,
    },
  };
}
