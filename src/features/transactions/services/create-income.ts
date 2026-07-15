import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  assertAccountActive,
  assertAccountBelongsToWorkspace,
  assertCanMutateTransactions,
  assertCategoryKindMatches,
  assertCategoryRequiredForType,
  assertOccurredOnNotTooFuture,
  assertTransactionCurrencyMatchesAccount,
  assertTransferCounterparty,
  assertValidAmount,
  normalizeDescription,
  TransactionDomainError,
} from "@/features/transactions/domain";
import type { CategoryKind } from "@/features/categories/domain";
import type { AccountType } from "@/features/accounts/domain";
import { parseOccurredOn } from "./utils";
import {
  TRANSACTION_SELECT,
  type TransactionRecord,
} from "./require-transaction-membership";

export type CreateIncomeServiceInput = {
  userId: string;
  workspaceId: string;
  accountId: string;
  categoryId: string;
  amountCents: number;
  occurredOn: string;
  description?: string | null;
};

/**
 * SPEC-05 T-02 / FR-01 — Persist an income for the caller's workspace.
 */
export async function createIncome(
  input: CreateIncomeServiceInput,
): Promise<TransactionRecord> {
  return createIncomeOrExpense("income", input);
}

// Shared implementation for income and expense so all invariants stay in one
// place and stay in sync with SPEC-05.
export async function createIncomeOrExpense(
  type: "income" | "expense",
  input: CreateIncomeServiceInput,
): Promise<TransactionRecord> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateTransactions(role);

  assertValidAmount(input.amountCents);
  assertCategoryRequiredForType(type, input.categoryId);
  assertTransferCounterparty(type, null);

  const [account, category, user] = await Promise.all([
    prisma.financeAccount.findUnique({
      where: { id: input.accountId },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
        type: true,
      },
    }),
    prisma.category.findUnique({
      where: { id: input.categoryId },
      select: {
        id: true,
        workspaceId: true,
        kind: true,
        isArchived: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { timezone: true },
    }),
  ]);

  if (!account) {
    throw new TransactionDomainError("La cuenta indicada no existe");
  }
  if (!category) {
    throw new TransactionDomainError("La categoría indicada no existe");
  }
  if (category.isArchived) {
    throw new TransactionDomainError("La categoría está archivada");
  }

  // SPEC-14: account may belong to another workspace (externally funded).
  if (account.workspaceId !== input.workspaceId) {
    const accountMembership = await prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: account.workspaceId,
          userId: input.userId,
        },
      },
      select: { role: true },
    });
    if (!accountMembership) {
      throw new TransactionDomainError(
        "No tenés permiso para usar esa cuenta de otro espacio",
      );
    }
    assertCanMutateTransactions(accountMembership.role);
  } else {
    assertAccountBelongsToWorkspace(account.workspaceId, input.workspaceId);
  }
  if (category.workspaceId !== input.workspaceId) {
    throw new TransactionDomainError(
      "La categoría no pertenece al workspace de la transacción",
    );
  }
  assertAccountActive(account.isArchived);
  assertCategoryKindMatches(type, category.kind as CategoryKind);

  const occurredOn = parseOccurredOn(input.occurredOn);
  assertOccurredOnNotTooFuture(occurredOn, new Date(), user?.timezone);

  const description = normalizeDescription(input.description ?? null);
  const currency = account.currency;
  assertTransactionCurrencyMatchesAccount(currency, account.currency);

  // Touch the account.type to satisfy the tsc unused hint and keep the
  // shape aligned with future rules that may differ per account type.
  void (account.type as AccountType);

  const created = await prisma.transaction.create({
    data: {
      workspaceId: input.workspaceId,
      type,
      amountCents: input.amountCents,
      currency,
      occurredOn,
      description,
      categoryId: input.categoryId,
      accountId: input.accountId,
      counterpartyAccountId: null,
      createdByUserId: input.userId,
    },
    select: TRANSACTION_SELECT,
  });

  return {
    ...created,
    type: created.type as TransactionRecord["type"],
  };
}
