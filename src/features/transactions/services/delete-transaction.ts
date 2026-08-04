import "server-only";
import { prisma } from "@/lib/prisma";
import {
  reverseContribution,
  type GoalStatus,
} from "@/features/goals/domain";
import { assertCanMutateTransactions } from "@/features/transactions/domain";
import { requireTransactionMembership } from "./require-transaction-membership";

/**
 * SPEC-05 FR-03 / SPEC-06 FR-04 / SPEC-08 H4 / SPEC-14 FR-07 / SPEC-16 FR-04 —
 * Hard-delete a transaction. Contribution / FX pairs cascade (both legs +
 * link). Goal-linked transfers undo the GoalContribution and restore goal
 * progress.
 */
export async function deleteTransaction({
  userId,
  transactionId,
}: {
  userId: string;
  transactionId: string;
}): Promise<{ id: string; cascadedIds: string[] }> {
  const { transaction, membership } = await requireTransactionMembership(
    userId,
    transactionId,
  );
  assertCanMutateTransactions(membership.role);

  const goalContribution = await prisma.goalContribution.findUnique({
    where: { transactionId: transaction.id },
    select: {
      id: true,
      amountCents: true,
      goal: {
        select: {
          id: true,
          currentAmountCents: true,
          targetAmountCents: true,
          status: true,
        },
      },
    },
  });

  if (goalContribution) {
    const { newCurrentAmountCents, newStatus } = reverseContribution(
      {
        currentAmountCents: goalContribution.goal.currentAmountCents,
        targetAmountCents: goalContribution.goal.targetAmountCents,
        status: goalContribution.goal.status as GoalStatus,
      },
      goalContribution.amountCents,
    );

    await prisma.$transaction(async (tx) => {
      await tx.goalContribution.delete({
        where: { id: goalContribution.id },
      });
      await tx.goal.update({
        where: { id: goalContribution.goal.id },
        data: {
          currentAmountCents: newCurrentAmountCents,
          status: newStatus,
        },
      });
      await tx.transaction.delete({ where: { id: transaction.id } });
    });

    return { id: transaction.id, cascadedIds: [] };
  }

  const fxExchange = await prisma.currencyExchange.findFirst({
    where: {
      OR: [
        { fromTransactionId: transaction.id },
        { toTransactionId: transaction.id },
      ],
    },
    select: {
      id: true,
      fromTransactionId: true,
      toTransactionId: true,
    },
  });

  if (fxExchange) {
    const twinId =
      fxExchange.fromTransactionId === transaction.id
        ? fxExchange.toTransactionId
        : fxExchange.fromTransactionId;

    await prisma.$transaction(async (tx) => {
      await tx.currencyExchange.delete({ where: { id: fxExchange.id } });
      await tx.transaction.deleteMany({
        where: { id: { in: [transaction.id, twinId] } },
      });
    });

    return { id: transaction.id, cascadedIds: [twinId] };
  }

  const link = await prisma.crossWorkspaceLink.findFirst({
    where: {
      OR: [
        { sourceTransactionId: transaction.id },
        { targetTransactionId: transaction.id },
      ],
    },
    select: {
      id: true,
      sourceTransactionId: true,
      targetTransactionId: true,
    },
  });

  if (!link) {
    await prisma.transaction.delete({ where: { id: transaction.id } });
    return { id: transaction.id, cascadedIds: [] };
  }

  const twinId =
    link.sourceTransactionId === transaction.id
      ? link.targetTransactionId
      : link.sourceTransactionId;

  // Twin may live in another workspace — verify mutate rights there too.
  const twin = await prisma.transaction.findUnique({
    where: { id: twinId },
    select: { id: true, workspaceId: true },
  });
  if (twin) {
    const twinMembership = await prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: twin.workspaceId,
          userId,
        },
      },
      select: { role: true },
    });
    if (twinMembership) {
      assertCanMutateTransactions(twinMembership.role);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.crossWorkspaceLink.delete({ where: { id: link.id } });
    await tx.transaction.deleteMany({
      where: { id: { in: [transaction.id, twinId] } },
    });
  });

  return { id: transaction.id, cascadedIds: [twinId] };
}
