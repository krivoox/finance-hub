import "server-only";
import {
  requireTransactionMembership,
  type TransactionRecord,
} from "./require-transaction-membership";
import { assertCanReadTransactions } from "@/features/transactions/domain";

/**
 * SPEC-05 §5 (Query GetTransaction) — Fetch one transaction, verifying
 * membership.
 */
export async function getTransaction({
  userId,
  transactionId,
}: {
  userId: string;
  transactionId: string;
}): Promise<TransactionRecord> {
  const { transaction, membership } = await requireTransactionMembership(
    userId,
    transactionId,
  );
  assertCanReadTransactions(membership.role);
  return transaction;
}
