import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import type { CategoryKind } from "@/features/categories/domain";
import {
  RecurringDomainError,
  assertCanMutateRecurring,
  assertRecurringRuleShape,
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
  type RecurringRuleRecord,
} from "./require-recurring-membership";

export type CreateRecurringRuleServiceInput = {
  userId: string;
  workspaceId: string;
  name: string;
  type: RecurringRuleType;
  amountCents: number;
  accountId: string;
  counterpartyAccountId?: string | null;
  categoryId?: string | null;
  description?: string | null;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string | null;
};

/**
 * SPEC-18 §4.1 / FR-01 — Persist a new recurring template. Currency is
 * derived from the origin account (rule.currency = account.currency).
 */
export async function createRecurringRule(
  input: CreateRecurringRuleServiceInput,
): Promise<RecurringRuleRecord> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateRecurring(role);

  const name = normalizeRecurringName(input.name);
  assertValidRecurringName(name);
  assertValidRecurringAmount(input.amountCents);
  if (!isRecurringFrequency(input.frequency)) {
    throw new RecurringDomainError("Frecuencia inválida");
  }
  assertValidRecurringDates(input.startDate, input.endDate ?? null);
  const description = assertValidDescription(input.description ?? null);

  const counterpartyId =
    input.type === "transfer" ? (input.counterpartyAccountId ?? null) : null;
  const categoryId =
    input.type === "transfer" ? null : (input.categoryId ?? null);

  const accountIds = new Set<string>([input.accountId]);
  if (counterpartyId) accountIds.add(counterpartyId);

  const [account, counterparty, category] = await Promise.all([
    prisma.financeAccount.findUnique({
      where: { id: input.accountId },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
      },
    }),
    counterpartyId
      ? prisma.financeAccount.findUnique({
          where: { id: counterpartyId },
          select: {
            id: true,
            workspaceId: true,
            currency: true,
            isArchived: true,
          },
        })
      : Promise.resolve(null),
    categoryId
      ? prisma.category.findUnique({
          where: { id: categoryId },
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
  if (account.workspaceId !== input.workspaceId) {
    throw new RecurringDomainError(
      "La cuenta no pertenece al workspace de la recurrente",
    );
  }
  if (counterpartyId && !counterparty) {
    throw new RecurringDomainError("La cuenta de destino no existe");
  }
  if (categoryId) {
    if (!category) {
      throw new RecurringDomainError("La categoría indicada no existe");
    }
    if (category.workspaceId !== input.workspaceId) {
      throw new RecurringDomainError(
        "La categoría no pertenece al workspace de la recurrente",
      );
    }
  }

  assertRecurringRuleShape({
    type: input.type,
    workspaceId: input.workspaceId,
    currency: account.currency,
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

  const created = await prisma.recurringRule.create({
    data: {
      workspaceId: input.workspaceId,
      name,
      type: input.type,
      amountCents: input.amountCents,
      currency: account.currency,
      accountId: input.accountId,
      counterpartyAccountId: counterpartyId,
      categoryId,
      description,
      frequency: input.frequency,
      startDate: parseRecurringDate(input.startDate),
      endDate: input.endDate ? parseRecurringDate(input.endDate) : null,
      status: "active",
      pausedReason: null,
      createdByUserId: input.userId,
    },
    select: RECURRING_SELECT,
  });

  return mapRecurringRow(created);
}
