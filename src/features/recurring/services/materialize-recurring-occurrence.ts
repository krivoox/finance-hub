import "server-only";
import { prisma } from "@/lib/prisma";
import {
  AccountArchivedError,
  TransactionDomainError,
  assertOccurredOnNotTooFuture,
  normalizeDescription,
  type TransactionType,
} from "@/features/transactions/domain";
import {
  AlreadyMaterializedError,
  addDays,
  assertCanMaterializeRule,
  assertCanMutateRecurring,
  assertIsScheduledOccurrence,
  assertNotAlreadyMaterialized,
  dateOnlyFromUtcDate,
  findPossibleDuplicates,
  resolveOccurredOn,
  todayDateOnly,
  type DateOnly,
  type DuplicateCandidateTx,
  type RecurringRuleType,
} from "@/features/recurring/domain";

import { parseRecurringDate } from "./utils";
import {
  TRANSACTION_SELECT,
  type TransactionRecord,
} from "@/features/transactions/services/require-transaction-membership";
import { requireRecurringMembership } from "./require-recurring-membership";

export type MaterializeRecurringOccurrenceInput = {
  userId: string;
  ruleId: string;
  scheduledOn: string;
  overrides?: {
    occurredOn?: string;
    amountCents?: number;
    description?: string | null;
    categoryId?: string | null;
  };
};

export type MaterializeRecurringOccurrenceResult = {
  transaction: TransactionRecord;
  possibleDuplicates: DuplicateCandidateTx[];
};

/**
 * SPEC-18 §4.6 — Convert a projected occurrence into a `Transaction` with
 * idempotent `(ruleId, scheduledOn)`. Runs the duplicate heuristic (§4.8)
 * and returns matches; UI decides whether to surface a confirm dialog.
 */
export async function materializeRecurringOccurrence(
  input: MaterializeRecurringOccurrenceInput,
): Promise<MaterializeRecurringOccurrenceResult> {
  const { rule, membership } = await requireRecurringMembership(
    input.userId,
    input.ruleId,
  );

  assertCanMutateRecurring(membership.role);

  assertCanMaterializeRule({
    status: rule.status,
    pausedReason: rule.pausedReason,
  });

  const scheduledOn = input.scheduledOn as DateOnly;
  // start/end are Prisma Date; project them as DateOnly for comparisons.
  const startDate = dateOnlyFromUtcDate(rule.startDate);
  const endDate = rule.endDate ? dateOnlyFromUtcDate(rule.endDate) : null;
  assertIsScheduledOccurrence(
    {
      frequency: rule.frequency,
      startDate,
      endDate,
    },
    scheduledOn,
  );

  // Idempotency (unique index also enforces this at DB level).
  const scheduledOnDate = parseRecurringDate(scheduledOn);
  const existing = await prisma.transaction.findFirst({
    where: {
      recurringRuleId: rule.id,
      scheduledOn: scheduledOnDate,
    },
    select: { id: true },
  });
  assertNotAlreadyMaterialized(
    rule.id,
    scheduledOn,
    new Set(existing ? [scheduledOn] : []),
    existing?.id ?? null,
  );

  // Load user timezone + accounts + category.
  const [user, account, counterparty, category] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { timezone: true },
    }),
    prisma.financeAccount.findUnique({
      where: { id: rule.accountId },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
      },
    }),
    rule.counterpartyAccountId
      ? prisma.financeAccount.findUnique({
          where: { id: rule.counterpartyAccountId },
          select: {
            id: true,
            workspaceId: true,
            currency: true,
            isArchived: true,
          },
        })
      : Promise.resolve(null),
    input.overrides?.categoryId !== undefined
      ? input.overrides.categoryId
        ? prisma.category.findUnique({
            where: { id: input.overrides.categoryId },
            select: {
              id: true,
              workspaceId: true,
              kind: true,
              isArchived: true,
            },
          })
        : Promise.resolve(null)
      : rule.categoryId
        ? prisma.category.findUnique({
            where: { id: rule.categoryId },
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
    throw new TransactionDomainError("La cuenta indicada no existe");
  }
  if (account.isArchived) {
    throw new AccountArchivedError();
  }
  if (rule.counterpartyAccountId) {
    if (!counterparty) {
      throw new TransactionDomainError("La cuenta de destino no existe");
    }
    if (counterparty.isArchived) {
      throw new AccountArchivedError();
    }
  }

  const timezone = user?.timezone ?? "UTC";
  const today = todayDateOnly(new Date(), timezone);

  const occurredOnDateOnly = resolveOccurredOn(
    scheduledOn,
    today,
    input.overrides?.occurredOn as DateOnly | undefined,
  );
  const occurredOn = parseRecurringDate(occurredOnDateOnly);
  assertOccurredOnNotTooFuture(occurredOn, new Date(), timezone);

  const amountCents = input.overrides?.amountCents ?? rule.amountCents;
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new TransactionDomainError("Monto inválido");
  }

  const description = normalizeDescription(
    input.overrides?.description !== undefined
      ? input.overrides.description
      : rule.description,
  );

  const effectiveCategoryId =
    rule.type === "transfer"
      ? null
      : input.overrides?.categoryId !== undefined
        ? input.overrides.categoryId
        : rule.categoryId;

  if (rule.type !== "transfer") {
    if (!effectiveCategoryId) {
      throw new TransactionDomainError("Falta la categoría");
    }
    if (!category) {
      throw new TransactionDomainError("La categoría indicada no existe");
    }
    if (category.isArchived) {
      throw new TransactionDomainError("La categoría está archivada");
    }
    if (category.workspaceId !== rule.workspaceId) {
      throw new TransactionDomainError(
        "La categoría no pertenece al workspace de la recurrente",
      );
    }
    if (category.kind !== rule.type) {
      throw new TransactionDomainError(
        "La categoría no coincide con el tipo de la recurrente",
      );
    }
  }

  // Duplicate heuristic: load recent txs of the workspace in [sched-3, sched+3].
  const from = parseRecurringDate(addDays(scheduledOn, -3));
  const to = parseRecurringDate(addDays(scheduledOn, 3));
  const recent = await prisma.transaction.findMany({
    where: {
      workspaceId: rule.workspaceId,
      accountId: rule.accountId,
      type: rule.type,
      recurringRuleId: null,
      occurredOn: { gte: from, lte: to },
    },
    select: {
      id: true,
      type: true,
      accountId: true,
      counterpartyAccountId: true,
      categoryId: true,
      amountCents: true,
      occurredOn: true,
      recurringRuleId: true,
    },
  });

  const possibleDuplicates = findPossibleDuplicates(
    {
      type: rule.type,
      accountId: rule.accountId,
      counterpartyAccountId: rule.counterpartyAccountId,
      categoryId: rule.categoryId,
      amountCents,
    },
    scheduledOn,
    recent.map((tx) => ({
      id: tx.id,
      type: tx.type as RecurringRuleType,
      accountId: tx.accountId,
      counterpartyAccountId: tx.counterpartyAccountId,
      categoryId: tx.categoryId,
      amountCents: tx.amountCents,
      occurredOn: dateOnlyFromUtcDate(tx.occurredOn),
      recurringRuleId: tx.recurringRuleId,
    })),
  );

  // Create the transaction ligada a la regla.
  let created;
  try {
    created = await prisma.transaction.create({
      data: {
        workspaceId: rule.workspaceId,
        type: rule.type as TransactionType,
        amountCents,
        currency: account.currency,
        occurredOn,
        description,
        categoryId: effectiveCategoryId,
        accountId: rule.accountId,
        counterpartyAccountId:
          rule.type === "transfer" ? rule.counterpartyAccountId : null,
        createdByUserId: input.userId,
        recurringRuleId: rule.id,
        scheduledOn: scheduledOnDate,
      },
      select: TRANSACTION_SELECT,
    });
  } catch (err: unknown) {
    // Race condition: another request materialized between the read and write.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      const dup = await prisma.transaction.findFirst({
        where: {
          recurringRuleId: rule.id,
          scheduledOn: scheduledOnDate,
        },
        select: { id: true },
      });
      throw new AlreadyMaterializedError(undefined, dup?.id ?? null);
    }
    throw err;
  }

  return {
    transaction: {
      ...created,
      type: created.type as TransactionType,
    },
    possibleDuplicates,
  };
}
