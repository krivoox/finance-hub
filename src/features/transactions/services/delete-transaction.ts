import "server-only";
import { prisma } from "@/lib/prisma";
import { assertCanMutateTransactions } from "@/features/transactions/domain";
import { requireTransactionMembership } from "./require-transaction-membership";

/**
 * SPEC-05 FR-03 / SPEC-06 FR-04 — Hard-delete a transaction. When splits or
 * settlements come online (SPEC-10), this will need to gate on those refs.
 */
export async function deleteTransaction({
  userId,
  transactionId,
}: {
  userId: string;
  transactionId: string;
}): Promise<{ id: string }> {
  const { transaction, membership } = await requireTransactionMembership(
    userId,
    transactionId,
  );
  assertCanMutateTransactions(membership.role);

  await prisma.transaction.delete({
    where: { id: transaction.id },
  });

  return { id: transaction.id };
}
