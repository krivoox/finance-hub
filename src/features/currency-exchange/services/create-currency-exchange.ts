import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  assertValidCurrencyExchange,
  CurrencyExchangeDomainError,
} from "@/features/currency-exchange/domain";
import {
  assertAccountActive,
  assertAccountBelongsToWorkspace,
  assertCanMutateTransactions,
  assertOccurredOnNotTooFuture,
  normalizeDescription,
  TransactionDomainError,
} from "@/features/transactions/domain";
import { parseOccurredOn } from "@/features/transactions/services/utils";

export type CreateCurrencyExchangeServiceInput = {
  userId: string;
  workspaceId: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmountCents: number;
  toAmountCents: number;
  occurredOn: string;
  description?: string | null;
};

export type CurrencyExchangeRecord = {
  id: string;
  workspaceId: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmountCents: number;
  toAmountCents: number;
  occurredOn: Date;
  description: string | null;
  fromTransactionId: string;
  toTransactionId: string;
  createdAt: Date;
};

/**
 * SPEC-16 FR-01 / FR-03 — Persist CurrencyExchange + fx_debit + fx_credit.
 */
export async function createCurrencyExchange(
  input: CreateCurrencyExchangeServiceInput,
): Promise<CurrencyExchangeRecord> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateTransactions(role);

  const [fromAccount, toAccount, user] = await Promise.all([
    prisma.financeAccount.findUnique({
      where: { id: input.fromAccountId },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
      },
    }),
    prisma.financeAccount.findUnique({
      where: { id: input.toAccountId },
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

  if (!fromAccount || !toAccount) {
    throw new TransactionDomainError("La cuenta indicada no existe");
  }

  assertAccountBelongsToWorkspace(fromAccount.workspaceId, input.workspaceId);
  assertAccountBelongsToWorkspace(toAccount.workspaceId, input.workspaceId);
  assertAccountActive(fromAccount.isArchived);
  assertAccountActive(toAccount.isArchived);

  assertValidCurrencyExchange({
    fromAccountId: fromAccount.id,
    toAccountId: toAccount.id,
    fromCurrency: fromAccount.currency,
    toCurrency: toAccount.currency,
    fromCents: input.fromAmountCents,
    toCents: input.toAmountCents,
  });

  const occurredOn = parseOccurredOn(input.occurredOn);
  assertOccurredOnNotTooFuture(occurredOn, new Date(), user?.timezone);
  const description = normalizeDescription(input.description ?? null);

  const result = await prisma.$transaction(async (tx) => {
    const fromTx = await tx.transaction.create({
      data: {
        workspaceId: input.workspaceId,
        type: "fx_debit",
        amountCents: input.fromAmountCents,
        currency: fromAccount.currency,
        occurredOn,
        description,
        categoryId: null,
        accountId: fromAccount.id,
        counterpartyAccountId: null,
        createdByUserId: input.userId,
      },
      select: { id: true },
    });

    const toTx = await tx.transaction.create({
      data: {
        workspaceId: input.workspaceId,
        type: "fx_credit",
        amountCents: input.toAmountCents,
        currency: toAccount.currency,
        occurredOn,
        description,
        categoryId: null,
        accountId: toAccount.id,
        counterpartyAccountId: null,
        createdByUserId: input.userId,
      },
      select: { id: true },
    });

    const exchange = await tx.currencyExchange.create({
      data: {
        workspaceId: input.workspaceId,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        fromAmountCents: input.fromAmountCents,
        toAmountCents: input.toAmountCents,
        occurredOn,
        description,
        createdByUserId: input.userId,
        fromTransactionId: fromTx.id,
        toTransactionId: toTx.id,
      },
      select: {
        id: true,
        workspaceId: true,
        fromAccountId: true,
        toAccountId: true,
        fromAmountCents: true,
        toAmountCents: true,
        occurredOn: true,
        description: true,
        fromTransactionId: true,
        toTransactionId: true,
        createdAt: true,
      },
    });

    return exchange;
  });

  return result;
}

/**
 * SPEC-16 FR-04 / T-03 — Delete exchange and both linked txs; restores balances.
 */
export async function deleteCurrencyExchange({
  userId,
  exchangeId,
}: {
  userId: string;
  exchangeId: string;
}): Promise<{ id: string }> {
  const exchange = await prisma.currencyExchange.findUnique({
    where: { id: exchangeId },
    select: {
      id: true,
      workspaceId: true,
      fromTransactionId: true,
      toTransactionId: true,
    },
  });

  if (!exchange) {
    throw new CurrencyExchangeDomainError("El canje no existe");
  }

  const { role } = await requireMembership(userId, exchange.workspaceId);
  assertCanMutateTransactions(role);

  await prisma.$transaction(async (tx) => {
    await tx.currencyExchange.delete({ where: { id: exchange.id } });
    await tx.transaction.deleteMany({
      where: {
        id: {
          in: [exchange.fromTransactionId, exchange.toTransactionId],
        },
      },
    });
  });

  return { id: exchange.id };
}
