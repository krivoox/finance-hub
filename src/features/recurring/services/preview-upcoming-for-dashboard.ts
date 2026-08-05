import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  PREVIEW_HORIZON_DAYS,
  addDays,
  assertCanReadRecurring,
  classifyOccurrence,
  computeOccurrences,
  dateOnlyFromUtcDate,
  todayDateOnly,
  type DateOnly,
  type OccurrenceStatus,
  type RecurringFrequency,
  type RecurringRuleType,
} from "@/features/recurring/domain";

export type UpcomingRecurringItem = {
  ruleId: string;
  ruleName: string;
  ruleType: RecurringRuleType;
  scheduledOn: DateOnly;
  status: OccurrenceStatus;
  amountCents: number;
  currency: string;
  accountName: string;
  counterpartyAccountName: string | null;
  categoryName: string | null;
};

export type PreviewUpcomingForDashboardInput = {
  userId: string;
  workspaceId: string;
  horizonDays?: number;
};

/**
 * SPEC-18 §5.2 PreviewUpcomingForDashboard — widget del dashboard: solo
 * `pending_today` + `pending_upcoming` sobre reglas `active`.
 */
export async function previewUpcomingForDashboard(
  input: PreviewUpcomingForDashboardInput,
): Promise<UpcomingRecurringItem[]> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanReadRecurring(role);

  const horizon = input.horizonDays ?? PREVIEW_HORIZON_DAYS;

  const [rules, user] = await Promise.all([
    prisma.recurringRule.findMany({
      where: {
        workspaceId: input.workspaceId,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        type: true,
        amountCents: true,
        currency: true,
        counterpartyAccountId: true,
        frequency: true,
        startDate: true,
        endDate: true,
        account: { select: { name: true } },
        counterpartyAccount: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { timezone: true },
    }),
  ]);

  const today = todayDateOnly(new Date(), user?.timezone ?? "UTC");
  const windowTo = addDays(today, horizon);

  const ruleIds = rules.map((r) => r.id);
  const materialized =
    ruleIds.length === 0
      ? []
      : await prisma.transaction.findMany({
          where: {
            recurringRuleId: { in: ruleIds },
            scheduledOn: { not: null },
          },
          select: { recurringRuleId: true, scheduledOn: true },
        });

  const materializedByRule = new Map<string, Set<DateOnly>>();
  for (const m of materialized) {
    if (!m.recurringRuleId || !m.scheduledOn) continue;
    const set =
      materializedByRule.get(m.recurringRuleId) ?? new Set<DateOnly>();
    set.add(dateOnlyFromUtcDate(m.scheduledOn));
    materializedByRule.set(m.recurringRuleId, set);
  }

  const items: UpcomingRecurringItem[] = [];

  for (const r of rules) {
    const startDate = dateOnlyFromUtcDate(r.startDate);
    const endDate = r.endDate ? dateOnlyFromUtcDate(r.endDate) : null;
    const frequency = r.frequency as RecurringFrequency;

    const scheduledSet = materializedByRule.get(r.id) ?? new Set<DateOnly>();

    const projected = computeOccurrences(
      { frequency, startDate, endDate, status: "active" },
      today,
      windowTo,
    );

    for (const scheduledOn of projected) {
      if (scheduledSet.has(scheduledOn)) continue;

      const occStatus = classifyOccurrence(
        scheduledOn,
        today,
        horizon,
        scheduledSet,
      );
      if (occStatus !== "pending_today" && occStatus !== "pending_upcoming") {
        continue;
      }

      items.push({
        ruleId: r.id,
        ruleName: r.name,
        ruleType: r.type as RecurringRuleType,
        scheduledOn,
        status: occStatus,
        amountCents: r.amountCents,
        currency: r.currency,
        accountName: r.account?.name ?? "",
        counterpartyAccountName: r.counterpartyAccount?.name ?? null,
        categoryName: r.category?.name ?? null,
      });
    }
  }

  items.sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn));
  return items;
}
