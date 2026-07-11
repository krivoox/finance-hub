import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  assertAccountActive,
  assertAccountBelongsToWorkspace,
  assertCanMutateTransactions,
  assertCategoryRequiredForType,
  assertOccurredOnNotTooFuture,
  assertTransactionCurrencyMatchesAccount,
  assertTransferAccounts,
  assertTransferCounterparty,
  assertValidAmount,
  normalizeDescription,
  TransactionDomainError,
} from "@/features/transactions/domain";
import { parseOccurredOn } from "./utils";
import {
  TRANSACTION_SELECT,
  type TransactionRecord,
} from "./require-transaction-membership";

export type CreateTransferServiceInput = {
  userId: string;
  workspaceId: string;
  accountId: string;
  counterpartyAccountId: string;
  amountCents: number;
  occurredOn: string;
  description?: string | null;
};

/**
 * SPEC-06 T-01 / FR-01 — Persist a transfer between two accounts of the same
 * workspace. Currencies must match (MVP: no FX). Origin ≠ destination.
 */
export async function createTransfer(
  input: CreateTransferServiceInput,
): Promise<TransactionRecord> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateTransactions(role);

  assertValidAmount(input.amountCents);
  assertTransferAccounts(input.accountId, input.counterpartyAccountId);
  assertCategoryRequiredForType("transfer", null);
  assertTransferCounterparty("transfer", input.counterpartyAccountId);

  const [origin, destination, user] = await Promise.all([
    prisma.financeAccount.findUnique({
      where: { id: input.accountId },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
      },
    }),
    prisma.financeAccount.findUnique({
      where: { id: input.counterpartyAccountId },
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

  if (!origin) {
    throw new TransactionDomainError("La cuenta de origen no existe");
  }
  if (!destination) {
    throw new TransactionDomainError("La cuenta de destino no existe");
  }

  assertAccountBelongsToWorkspace(origin.workspaceId, input.workspaceId);
  assertAccountBelongsToWorkspace(destination.workspaceId, input.workspaceId);
  assertAccountActive(origin.isArchived);
  assertAccountActive(destination.isArchived);
  assertTransactionCurrencyMatchesAccount(destination.currency, origin.currency);

  const occurredOn = parseOccurredOn(input.occurredOn);
  assertOccurredOnNotTooFuture(occurredOn, new Date(), user?.timezone);

  const description = normalizeDescription(input.description ?? null);

  const created = await prisma.transaction.create({
    data: {
      workspaceId: input.workspaceId,
      type: "transfer",
      amountCents: input.amountCents,
      currency: origin.currency,
      occurredOn,
      description,
      categoryId: null,
      accountId: input.accountId,
      counterpartyAccountId: input.counterpartyAccountId,
      createdByUserId: input.userId,
    },
    select: TRANSACTION_SELECT,
  });

  return {
    ...created,
    type: created.type as TransactionRecord["type"],
  };
}
