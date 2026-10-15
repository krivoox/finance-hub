import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import type { CategoryKind } from "@/features/categories/domain";
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
  computeGroupSplit,
  normalizeDescription,
  toRecurringFrequency,
  TransactionDomainError,
  type GroupSplitMemberInput,
  type GroupSplitMode,
  type TransactionFrequency,
} from "@/features/transactions/domain";
import { RECURRING_NAME_MAX_LENGTH } from "@/features/recurring/domain";
import { parseOccurredOn } from "./utils";

export type CoreGroupSplitInput = {
  readonly method: GroupSplitMode;
  readonly members: readonly GroupSplitMemberInput[];
};

export type CreateCoreTransactionServiceInput = {
  userId: string;
  workspaceId: string;
  /** Ledger types handled here; adjustments go through their own service. */
  type: "income" | "expense" | "transfer";
  accountId: string;
  counterpartyAccountId?: string | null;
  categoryId?: string | null;
  amountCents: number;
  currency?: string;
  occurredOn: string;
  description?: string | null;
  frequency?: TransactionFrequency;
  groupSplit?: CoreGroupSplitInput | null;
};

export type CreateCoreTransactionResult = {
  transactionId: string;
  groupSplitId: string | null;
  recurringRuleId: string | null;
};

function ruleNameFrom(input: {
  description: string | null;
  categoryName?: string | null;
  type: "income" | "expense" | "transfer";
  originName?: string | null;
  destinationName?: string | null;
}): string {
  const base =
    input.description ??
    input.categoryName ??
    (input.type === "transfer"
      ? `Transferencia ${input.originName ?? ""} → ${input.destinationName ?? ""}`.trim()
      : input.type === "income"
        ? "Ingreso recurrente"
        : "Gasto recurrente");
  const trimmed = base.trim() || "Movimiento recurrente";
  return trimmed.slice(0, RECURRING_NAME_MAX_LENGTH);
}

/**
 * SPEC-23 — Persist a movement from the core transaction screen, together with
 * its optional ad-hoc group split and an optional `RecurringRule` (SPEC-18).
 *
 * Everything is written in a single DB transaction so a failed split/rule does
 * not leave a half-registered movement.
 */
export async function createCoreTransaction(
  input: CreateCoreTransactionServiceInput,
): Promise<CreateCoreTransactionResult> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateTransactions(role);

  assertValidAmount(input.amountCents);
  assertCategoryRequiredForType(input.type, input.categoryId ?? null);
  assertTransferCounterparty(input.type, input.counterpartyAccountId ?? null);

  const counterpartyId =
    input.type === "transfer" ? (input.counterpartyAccountId ?? null) : null;
  const categoryId =
    input.type === "transfer" ? null : (input.categoryId ?? null);

  const [account, category, counterparty, user] = await Promise.all([
    prisma.financeAccount.findUnique({
      where: { id: input.accountId },
      select: {
        id: true,
        name: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
      },
    }),
    categoryId
      ? prisma.category.findUnique({
          where: { id: categoryId },
          select: {
            id: true,
            name: true,
            workspaceId: true,
            kind: true,
            isArchived: true,
          },
        })
      : Promise.resolve(null),
    counterpartyId
      ? prisma.financeAccount.findUnique({
          where: { id: counterpartyId },
          select: {
            id: true,
            name: true,
            workspaceId: true,
            currency: true,
            isArchived: true,
          },
        })
      : Promise.resolve(null),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { timezone: true },
    }),
  ]);

  if (!account) {
    throw new TransactionDomainError("La cuenta indicada no existe");
  }
  if (categoryId && !category) {
    throw new TransactionDomainError("La categoría indicada no existe");
  }
  if (category?.isArchived) {
    throw new TransactionDomainError("La categoría está archivada");
  }
  if (counterpartyId && !counterparty) {
    throw new TransactionDomainError("La cuenta de destino no existe");
  }

  assertAccountBelongsToWorkspace(account.workspaceId, input.workspaceId);
  assertAccountActive(account.isArchived);
  if (category) {
    if (category.workspaceId !== input.workspaceId) {
      throw new TransactionDomainError(
        "La categoría no pertenece al workspace de la transacción",
      );
    }
    assertCategoryKindMatches(input.type, category.kind as CategoryKind);
  }
  if (counterparty) {
    assertAccountBelongsToWorkspace(counterparty.workspaceId, input.workspaceId);
    assertAccountActive(counterparty.isArchived);
    assertTransferAccounts(account.id, counterparty.id);
    assertTransactionCurrencyMatchesAccount(
      counterparty.currency,
      account.currency,
    );
  }

  const occurredOn = parseOccurredOn(input.occurredOn);
  assertOccurredOnNotTooFuture(occurredOn, new Date(), user?.timezone);

  const description = normalizeDescription(input.description ?? null);
  const currency = account.currency;
  assertTransactionCurrencyMatchesAccount(input.currency ?? currency, currency);

  const frequency = input.frequency ?? "once";
  const recurringFrequency = toRecurringFrequency(frequency);

  // Ad-hoc group split only makes sense on income/expense.
  let splitResult: ReturnType<typeof computeGroupSplit> | null = null;
  if (input.groupSplit) {
    if (input.type === "transfer") {
      throw new TransactionDomainError(
        "El gasto grupal solo aplica a gastos e ingresos",
      );
    }
    splitResult = computeGroupSplit({
      totalCents: input.amountCents,
      mode: input.groupSplit.method,
      members: input.groupSplit.members,
    });
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        workspaceId: input.workspaceId,
        type: input.type,
        amountCents: input.amountCents,
        currency,
        occurredOn,
        description,
        categoryId,
        accountId: input.accountId,
        counterpartyAccountId: counterpartyId,
        createdByUserId: input.userId,
      },
      select: { id: true },
    });

    let groupSplitId: string | null = null;
    if (input.groupSplit && splitResult) {
      const split = await tx.transactionGroupSplit.create({
        data: {
          transactionId: created.id,
          method: input.groupSplit.method,
          userShareCents: splitResult.userShareCents,
          members: {
            create: splitResult.members.map((member, index) => ({
              name: member.name,
              amountCents: member.amountCents,
              position: index,
            })),
          },
        },
        select: { id: true },
      });
      groupSplitId = split.id;
    }

    let recurringRuleId: string | null = null;
    if (recurringFrequency) {
      const rule = await tx.recurringRule.create({
        data: {
          workspaceId: input.workspaceId,
          name: ruleNameFrom({
            description,
            categoryName: category?.name ?? null,
            type: input.type,
            originName: account.name,
            destinationName: counterparty?.name ?? null,
          }),
          type: input.type,
          amountCents: input.amountCents,
          currency,
          accountId: input.accountId,
          counterpartyAccountId: counterpartyId,
          categoryId,
          description,
          frequency: recurringFrequency,
          startDate: occurredOn,
          endDate: null,
          status: "active",
          pausedReason: null,
          createdByUserId: input.userId,
        },
        select: { id: true },
      });
      recurringRuleId = rule.id;
      await tx.transaction.update({
        where: { id: created.id },
        data: { recurringRuleId: rule.id, scheduledOn: occurredOn },
      });
    }

    return { transactionId: created.id, groupSplitId, recurringRuleId };
  });
}
