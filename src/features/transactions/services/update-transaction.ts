import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertAccountActive,
  assertAccountBelongsToWorkspace,
  assertCanMutateTransactions,
  assertCategoryKindMatches,
  assertCategoryRequiredForType,
  assertOccurredOnNotTooFuture,
  assertTransactionCurrencyMatchesAccount,
  assertTransferAccounts,
  assertTransferCounterparty,
  assertValidAmount,
  normalizeDescription,
  TransactionDomainError,
  type TransactionType,
} from "@/features/transactions/domain";
import type { CategoryKind } from "@/features/categories/domain";
import { parseOccurredOn } from "./utils";
import {
  requireTransactionMembership,
  TRANSACTION_SELECT,
  type TransactionRecord,
} from "./require-transaction-membership";

export type UpdateTransactionServiceInput = {
  userId: string;
  transactionId: string;
  amountCents?: number;
  occurredOn?: string;
  description?: string | null;
  categoryId?: string | null;
  accountId?: string;
  counterpartyAccountId?: string | null;
};

/**
 * SPEC-05 FR-02 / SPEC-06 FR-04 — Update mutable fields of a transaction.
 * `type` is immutable: to change income↔expense the caller must delete and
 * recreate.
 */
export async function updateTransaction(
  input: UpdateTransactionServiceInput,
): Promise<TransactionRecord> {
  const { transaction, membership } = await requireTransactionMembership(
    input.userId,
    input.transactionId,
  );
  assertCanMutateTransactions(membership.role);

  const type: TransactionType = transaction.type;

  const nextAmount = input.amountCents ?? transaction.amountCents;
  assertValidAmount(nextAmount);

  const nextAccountId = input.accountId ?? transaction.accountId;
  const nextCounterparty =
    input.counterpartyAccountId !== undefined
      ? input.counterpartyAccountId
      : transaction.counterpartyAccountId;
  const nextCategoryId =
    input.categoryId !== undefined ? input.categoryId : transaction.categoryId;

  assertCategoryRequiredForType(type, nextCategoryId);
  assertTransferCounterparty(type, nextCounterparty);

  if (type === "transfer") {
    assertTransferAccounts(nextAccountId, nextCounterparty as string);
  }

  const accountsToLoad = new Set<string>([nextAccountId]);
  if (type === "transfer" && nextCounterparty) {
    accountsToLoad.add(nextCounterparty);
  }
  const accounts = await prisma.financeAccount.findMany({
    where: { id: { in: Array.from(accountsToLoad) } },
    select: {
      id: true,
      workspaceId: true,
      currency: true,
      isArchived: true,
    },
  });
  const byId = new Map(accounts.map((a) => [a.id, a]));

  const origin = byId.get(nextAccountId);
  if (!origin) {
    throw new TransactionDomainError("La cuenta indicada no existe");
  }
  assertAccountBelongsToWorkspace(origin.workspaceId, transaction.workspaceId);
  assertAccountActive(origin.isArchived);

  let counterparty = null;
  if (type === "transfer" && nextCounterparty) {
    counterparty = byId.get(nextCounterparty);
    if (!counterparty) {
      throw new TransactionDomainError("La cuenta de destino no existe");
    }
    assertAccountBelongsToWorkspace(
      counterparty.workspaceId,
      transaction.workspaceId,
    );
    assertAccountActive(counterparty.isArchived);
    assertTransactionCurrencyMatchesAccount(
      counterparty.currency,
      origin.currency,
    );
  }

  if (nextCategoryId !== null) {
    const category = await prisma.category.findUnique({
      where: { id: nextCategoryId },
      select: {
        id: true,
        workspaceId: true,
        kind: true,
        isArchived: true,
      },
    });
    if (!category) {
      throw new TransactionDomainError("La categoría indicada no existe");
    }
    if (category.workspaceId !== transaction.workspaceId) {
      throw new TransactionDomainError(
        "La categoría no pertenece al workspace de la transacción",
      );
    }
    if (category.isArchived) {
      throw new TransactionDomainError("La categoría está archivada");
    }
    assertCategoryKindMatches(type, category.kind as CategoryKind);
  }

  let nextOccurredOn: Date | undefined;
  if (input.occurredOn !== undefined) {
    nextOccurredOn = parseOccurredOn(input.occurredOn);
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { timezone: true },
    });
    assertOccurredOnNotTooFuture(nextOccurredOn, new Date(), user?.timezone);
  }

  const nextDescription =
    input.description !== undefined
      ? normalizeDescription(input.description)
      : transaction.description;

  const updated = await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      amountCents: nextAmount,
      accountId: nextAccountId,
      counterpartyAccountId: type === "transfer" ? nextCounterparty : null,
      categoryId: type === "transfer" ? null : nextCategoryId,
      description: nextDescription,
      currency: origin.currency,
      ...(nextOccurredOn ? { occurredOn: nextOccurredOn } : {}),
    },
    select: TRANSACTION_SELECT,
  });

  return {
    ...updated,
    type: updated.type as TransactionType,
  };
}
