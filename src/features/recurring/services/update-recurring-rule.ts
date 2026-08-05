import "server-only";
import { prisma } from "@/lib/prisma";
import type { CategoryKind } from "@/features/categories/domain";
import {
  RecurringDomainError,
  RecurringRuleEndedError,
  assertCanMutateRecurring,
  assertCurrencyImmutable,
  assertRecurringRuleShape,
  assertTypeImmutable,
  assertValidRecurringAmount,
  assertValidRecurringDates,
  assertValidRecurringName,
  assertValidDescription,
  isRecurringFrequency,
  normalizeRecurringName,
  type RecurringFrequency,
  type RecurringRuleType,
} from "@/features/recurring/domain";

import { parseRecurringDate } from "./utils";
import {
  RECURRING_SELECT,
  mapRecurringRow,
  requireRecurringMembership,
  type RecurringRuleRecord,
} from "./require-recurring-membership";

export type UpdateRecurringRuleServiceInput = {
  userId: string;
  ruleId: string;
  name?: string;
  amountCents?: number;
  accountId?: string;
  counterpartyAccountId?: string | null;
  categoryId?: string | null;
  description?: string | null;
  frequency?: RecurringFrequency;
  startDate?: string;
  endDate?: string | null;
  /**
   * Type / currency are immutable (SPEC-18 §4.5). If provided and different,
   * we reject explicitly to help the caller migrate.
   */
  type?: RecurringRuleType;
  currency?: string;
};

/**
 * SPEC-18 §4.5 — Edit a recurring rule. Only future non-materialized
 * occurrences are affected (that's an implicit property of the model:
 * materialized transactions keep their historical values).
 */
export async function updateRecurringRule(
  input: UpdateRecurringRuleServiceInput,
): Promise<RecurringRuleRecord> {
  const { rule, membership } = await requireRecurringMembership(
    input.userId,
    input.ruleId,
  );
  assertCanMutateRecurring(membership.role);

  if (rule.status === "ended") {
    throw new RecurringRuleEndedError();
  }

  assertTypeImmutable(rule.type, input.type);
  assertCurrencyImmutable(rule.currency, input.currency);

  const nextName =
    input.name !== undefined ? normalizeRecurringName(input.name) : rule.name;
  if (input.name !== undefined) assertValidRecurringName(nextName);

  const nextAmount = input.amountCents ?? rule.amountCents;
  if (input.amountCents !== undefined) assertValidRecurringAmount(nextAmount);

  if (input.frequency !== undefined && !isRecurringFrequency(input.frequency)) {
    throw new RecurringDomainError("Frecuencia inválida");
  }
  const nextFrequency = input.frequency ?? rule.frequency;

  const nextStart = input.startDate ?? undefined;
  const nextEnd = input.endDate;
  const startForValidation =
    nextStart ??
    `${rule.startDate.getUTCFullYear()}-${pad(rule.startDate.getUTCMonth() + 1)}-${pad(rule.startDate.getUTCDate())}`;
  const endForValidation =
    nextEnd === undefined
      ? rule.endDate
        ? `${rule.endDate.getUTCFullYear()}-${pad(rule.endDate.getUTCMonth() + 1)}-${pad(rule.endDate.getUTCDate())}`
        : null
      : nextEnd;
  assertValidRecurringDates(startForValidation, endForValidation);

  const nextDescription =
    input.description !== undefined
      ? assertValidDescription(input.description)
      : rule.description;

  const nextAccountId = input.accountId ?? rule.accountId;
  const nextCounterpartyId =
    rule.type === "transfer"
      ? input.counterpartyAccountId !== undefined
        ? input.counterpartyAccountId
        : rule.counterpartyAccountId
      : null;
  const nextCategoryId =
    rule.type === "transfer"
      ? null
      : input.categoryId !== undefined
        ? input.categoryId
        : rule.categoryId;

  const accountIds = new Set<string>([nextAccountId]);
  if (nextCounterpartyId) accountIds.add(nextCounterpartyId);

  const [account, counterparty, category] = await Promise.all([
    prisma.financeAccount.findUnique({
      where: { id: nextAccountId },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
      },
    }),
    nextCounterpartyId
      ? prisma.financeAccount.findUnique({
          where: { id: nextCounterpartyId },
          select: {
            id: true,
            workspaceId: true,
            currency: true,
            isArchived: true,
          },
        })
      : Promise.resolve(null),
    nextCategoryId
      ? prisma.category.findUnique({
          where: { id: nextCategoryId },
          select: {
            id: true,
            workspaceId: true,
            kind: true,
            isArchived: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!account) {
    throw new RecurringDomainError("La cuenta indicada no existe");
  }
  if (account.workspaceId !== rule.workspaceId) {
    throw new RecurringDomainError(
      "La cuenta no pertenece al workspace de la recurrente",
    );
  }
  if (nextCounterpartyId && !counterparty) {
    throw new RecurringDomainError("La cuenta de destino no existe");
  }
  if (nextCategoryId) {
    if (!category) {
      throw new RecurringDomainError("La categoría indicada no existe");
    }
    if (category.workspaceId !== rule.workspaceId) {
      throw new RecurringDomainError(
        "La categoría no pertenece al workspace de la recurrente",
      );
    }
  }

  assertRecurringRuleShape({
    type: rule.type,
    workspaceId: rule.workspaceId,
    currency: rule.currency,
    account,
    counterparty: counterparty
      ? {
          id: counterparty.id,
          workspaceId: counterparty.workspaceId,
          currency: counterparty.currency,
          isArchived: counterparty.isArchived,
        }
      : null,
    category: category
      ? {
          id: category.id,
          kind: category.kind as CategoryKind,
          isArchived: category.isArchived,
        }
      : null,
  });

  // Rule currency must still match account currency (guarded above), and rule
  // currency is immutable — reject if the swap would drift.
  if (account.currency !== rule.currency) {
    throw new RecurringDomainError(
      "La cuenta usa otra moneda; creá una recurrente nueva",
    );
  }

  const updated = await prisma.recurringRule.update({
    where: { id: rule.id },
    data: {
      name: nextName,
      amountCents: nextAmount,
      accountId: nextAccountId,
      counterpartyAccountId: nextCounterpartyId,
      categoryId: nextCategoryId,
      description: nextDescription,
      frequency: nextFrequency,
      ...(input.startDate ? { startDate: parseRecurringDate(input.startDate) } : {}),
      ...(input.endDate !== undefined
        ? { endDate: input.endDate ? parseRecurringDate(input.endDate) : null }
        : {}),
    },
    select: RECURRING_SELECT,
  });

  return mapRecurringRow(updated);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
