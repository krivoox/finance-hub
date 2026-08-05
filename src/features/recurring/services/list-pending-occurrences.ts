import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  PREVIEW_HORIZON_DAYS,
  addDays,
  assertCanReadRecurring,
  canMaterializeOn,
  classifyOccurrence,
  computeOccurrences,
  dateOnlyFromUtcDate,
  isScheduledOccurrence,
  todayDateOnly,
  type DateOnly,
  type OccurrenceStatus,
  type RecurringFrequency,
  type RecurringPausedReason,
  type RecurringRuleStatus,
  type RecurringRuleType,
} from "@/features/recurring/domain";

export type PendingOccurrence = {
  ruleId: string;
  ruleName: string;
  ruleType: RecurringRuleType;
  scheduledOn: DateOnly;
  status: OccurrenceStatus;
  amountCents: number;
  currency: string;
  accountId: string;
  accountName: string;
  counterpartyAccountId: string | null;
  counterpartyAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  description: string | null;
  ruleStatus: RecurringRuleStatus;
  rulePausedReason: RecurringPausedReason | null;
  /** SPEC-18 §4.6.1 — `scheduledOn ≤ today + 1`; el resto todavía no se puede confirmar. */
  isConfirmable: boolean;
};

export type ListPendingOccurrencesInput = {
  userId: string;
  workspaceId: string;
  horizonDays?: number;
};

/**
 * SPEC-18 §5.2 ListPendingOccurrences — bandeja del hub.
 *
 * Incluye:
 * - reglas `active` con ocurrencias en `[today − 365, today + horizon]`
 * - reglas `paused` con `pausedReason='manual'` para ocurrencias vencidas
 *   (permite ponerse al día, T-29).
 *
 * Excluye ocurrencias ya materializadas. Devuelve orden asc por `scheduledOn`.
 */
export async function listPendingOccurrences(
  input: ListPendingOccurrencesInput,
): Promise<PendingOccurrence[]> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanReadRecurring(role);

  const horizon = input.horizonDays ?? PREVIEW_HORIZON_DAYS;

  const [rules, user] = await Promise.all([
    prisma.recurringRule.findMany({
      where: {
        workspaceId: input.workspaceId,
        status: { in: ["active", "paused"] },
      },
      select: {
        id: true,
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
  const windowFrom = addDays(today, -365);
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
          select: {
            recurringRuleId: true,
            scheduledOn: true,
          },
        });

  const materializedByRule = new Map<string, Set<DateOnly>>();
  for (const m of materialized) {
    if (!m.recurringRuleId || !m.scheduledOn) continue;
    const set =
      materializedByRule.get(m.recurringRuleId) ?? new Set<DateOnly>();
    set.add(dateOnlyFromUtcDate(m.scheduledOn));
    materializedByRule.set(m.recurringRuleId, set);
  }

  const items: PendingOccurrence[] = [];

  for (const r of rules) {
    const status = r.status as RecurringRuleStatus;
    const pausedReason =
      (r.pausedReason as RecurringPausedReason | null) ?? null;
    const startDate = dateOnlyFromUtcDate(r.startDate);
    const endDate = r.endDate ? dateOnlyFromUtcDate(r.endDate) : null;
    const frequency = r.frequency as RecurringFrequency;

    // Overdue-only when paused manual; active projects the full window.
    const projectStatus: RecurringRuleStatus =
      status === "active" ? "active" : "active"; // compute assuming active shape
    const shouldSkipPausedAutopause =
      status === "paused" && pausedReason === "account_archived";
    if (shouldSkipPausedAutopause) continue;

    const scheduledSet = materializedByRule.get(r.id) ?? new Set<DateOnly>();

    const projected = computeOccurrences(
      { frequency, startDate, endDate, status: projectStatus },
      windowFrom,
      status === "paused" ? today : windowTo,
    );

    for (const scheduledOn of projected) {
      if (scheduledSet.has(scheduledOn)) continue;

      const occStatus = classifyOccurrence(
        scheduledOn,
        today,
        horizon,
        scheduledSet,
      );
      if (
        occStatus !== "pending_past" &&
        occStatus !== "pending_today" &&
        occStatus !== "pending_upcoming"
      ) {
        continue;
      }
      if (status === "paused" && occStatus !== "pending_past") continue;

      // Safety net: still confirm scheduledOn is a genuine occurrence
      // (paranoid check against future refactors of computeOccurrences).
      if (
        !isScheduledOccurrence(
          { frequency, startDate, endDate },
          scheduledOn,
        )
      ) {
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
        accountId: r.accountId,
        accountName: r.account?.name ?? "",
        counterpartyAccountId: r.counterpartyAccountId,
        counterpartyAccountName: r.counterpartyAccount?.name ?? null,
        categoryId: r.categoryId,
        categoryName: r.category?.name ?? null,
        description: r.description,
        ruleStatus: status,
        rulePausedReason: pausedReason,
        isConfirmable: canMaterializeOn(scheduledOn, today),
      });
    }
  }

  items.sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn));
  return items;
}
