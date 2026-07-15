import "server-only";
import { prisma } from "@/lib/prisma";
import { assertCanMutateTransactions } from "@/features/transactions/domain";
import { requireTransactionMembership } from "./require-transaction-membership";

/**
 * SPEC-05 FR-03 / SPEC-06 FR-04 / SPEC-14 FR-07 —
 * Hard-delete a transaction. Contribution pairs cascade (both legs + link).
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
