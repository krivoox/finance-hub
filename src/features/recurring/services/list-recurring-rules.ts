import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  addDays,
  assertCanReadRecurring,
  computeOccurrences,
  dateOnlyFromUtcDate,
  todayDateOnly,
  type DateOnly,
  type RecurringFrequency,
  type RecurringPausedReason,
  type RecurringRuleStatus,
  type RecurringRuleType,
} from "@/features/recurring/domain";

export type RecurringRuleListItem = {
  id: string;
  workspaceId: string;
  name: string;
  type: RecurringRuleType;
  amountCents: number;
  currency: string;
  accountId: string;
  accountName: string;
  counterpartyAccountId: string | null;
  counterpartyAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  description: string | null;
  frequency: RecurringFrequency;
  startDate: DateOnly;
  endDate: DateOnly | null;
  status: RecurringRuleStatus;
  pausedReason: RecurringPausedReason | null;
  nextOccurrence: DateOnly | null;
  lastMaterializedOn: DateOnly | null;
  /** Cuántas ocurrencias ya se materializaron como transacción. */
  materializedCount: number;
  createdByUserId: string;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ListRecurringRulesServiceInput = {
  userId: string;
  workspaceId: string;
  status?: RecurringRuleStatus | "all";
  type?: RecurringRuleType;
};

/**
 * SPEC-18 §5.2 ListRecurringRules — includes light aggregates (next
 * projected occurrence + last materialized). Defaults to non-ended rules.
 */
export async function listRecurringRules(
  input: ListRecurringRulesServiceInput,
): Promise<RecurringRuleListItem[]> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanReadRecurring(role);

  const statusFilter =
    input.status && input.status !== "all"
      ? { status: input.status }
      : { status: { not: "ended" as RecurringRuleStatus } };

  const rows = await prisma.recurringRule.findMany({
    where: {
      workspaceId: input.workspaceId,
      ...statusFilter,
      ...(input.type ? { type: input.type } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      workspaceId: true,
      name: true,
      type: true,
      amountCents: true,
      currency: true,
      accountId: true,
      counterpartyAccountId: true,
      categoryId: true,
      description: true,
      frequency: true,
      startDate: true,
      endDate: true,
      status: true,
      pausedReason: true,
      createdByUserId: true,
      endedAt: true,
      createdAt: true,
      updatedAt: true,
      account: { select: { name: true } },
      counterpartyAccount: { select: { name: true } },
      category: { select: { name: true } },
      transactions: {
        select: { scheduledOn: true },
        orderBy: { scheduledOn: "desc" },
        take: 1,
      },
      _count: { select: { transactions: true } },
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { timezone: true },
  });
  const today = todayDateOnly(new Date(), user?.timezone ?? "UTC");

  return rows.map((r) => {
    const start = dateOnlyFromUtcDate(r.startDate);
    const end = r.endDate ? dateOnlyFromUtcDate(r.endDate) : null;
    const status = r.status as RecurringRuleStatus;

    let nextOccurrence: DateOnly | null = null;
    if (status === "active") {
      // Look ahead up to 90 days from today (or from startDate if future).
      const from = start > today ? start : today;
      const to = addDays(from, 90);
      const hits = computeOccurrences(
        {
          frequency: r.frequency as RecurringFrequency,
          startDate: start,
          endDate: end,
          status,
        },
        from,
        to,
      );
      nextOccurrence = hits[0] ?? null;
    }

    const lastTx = r.transactions[0]?.scheduledOn;
    return {
      id: r.id,
      workspaceId: r.workspaceId,
      name: r.name,
      type: r.type as RecurringRuleType,
      amountCents: r.amountCents,
      currency: r.currency,
      accountId: r.accountId,
      accountName: r.account?.name ?? "",
      counterpartyAccountId: r.counterpartyAccountId,
      counterpartyAccountName: r.counterpartyAccount?.name ?? null,
      categoryId: r.categoryId,
      categoryName: r.category?.name ?? null,
      description: r.description,
      frequency: r.frequency as RecurringFrequency,
      startDate: start,
      endDate: end,
      status,
      pausedReason:
        (r.pausedReason as RecurringPausedReason | null) ?? null,
      nextOccurrence,
      lastMaterializedOn: lastTx ? dateOnlyFromUtcDate(lastTx) : null,
      materializedCount: r._count.transactions,
      createdByUserId: r.createdByUserId,
      endedAt: r.endedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });
}
