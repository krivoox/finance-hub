import "server-only";
import { prisma } from "@/lib/prisma";
import {
  requireMembership,
  type MembershipContext,
} from "@/features/workspaces/services";
import {
  TransactionNotFoundError,
  type TransactionType,
} from "@/features/transactions/domain";

export type TransactionRecord = {
  id: string;
  workspaceId: string;
  type: TransactionType;
  amountCents: number;
  currency: string;
  occurredOn: Date;
  description: string | null;
  categoryId: string | null;
  accountId: string;
  counterpartyAccountId: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

const TRANSACTION_SELECT = {
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
} as const;

/**
 * Loads a transaction and verifies caller membership in its workspace.
 * Throws `TransactionNotFoundError` for unknown ids (no workspace leak).
 */
export async function requireTransactionMembership(
  userId: string,
  transactionId: string,
): Promise<{
  transaction: TransactionRecord;
  membership: MembershipContext;
}> {
  const row = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: TRANSACTION_SELECT,
  });
  if (!row) {
    throw new TransactionNotFoundError(transactionId);
  }
  const transaction: TransactionRecord = {
    ...row,
    type: row.type as TransactionType,
  };
  const membership = await requireMembership(userId, transaction.workspaceId);
  return { transaction, membership };
}

export { TRANSACTION_SELECT };
