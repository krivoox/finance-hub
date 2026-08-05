import "server-only";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  assertCanReadRecurring,
  computeOccurrences,
  dateOnlyFromUtcDate,
  todayDateOnly,
  type DateOnly,
} from "@/features/recurring/domain";

import { requireRecurringMembership } from "./require-recurring-membership";
import { toDomainRule } from "./utils";

export type RecurringRuleDetail = {
  rule: ReturnType<typeof toDomainRule>;
  accountName: string;
  counterpartyAccountName: string | null;
  categoryName: string | null;
  nextOccurrences: DateOnly[];
  recentTransactions: {
    id: string;
    occurredOn: DateOnly;
    scheduledOn: DateOnly | null;
    amountCents: number;
    currency: string;
    description: string | null;
  }[];
};

/**
 * SPEC-18 §5.2 GetRecurringRule — detail view helper. Loads rule + names +
 * upcoming projected occurrences (next 3) + last materialized transactions.
 */
export async function getRecurringRule({
  userId,
  ruleId,
}: {
  userId: string;
  ruleId: string;
}): Promise<RecurringRuleDetail> {
  const { rule, membership } = await requireRecurringMembership(userId, ruleId);
  assertCanReadRecurring(membership.role);

  const [names, user, transactions] = await Promise.all([
    prisma.recurringRule.findUnique({
      where: { id: rule.id },
      select: {
        account: { select: { name: true } },
        counterpartyAccount: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    }),
    prisma.transaction.findMany({
      where: { recurringRuleId: rule.id },
      orderBy: { scheduledOn: "desc" },
      take: 5,
      select: {
        id: true,
        occurredOn: true,
        scheduledOn: true,
        amountCents: true,
        currency: true,
        description: true,
      },
    }),
  ]);

  const domainRule = toDomainRule(rule);
  const today = todayDateOnly(new Date(), user?.timezone ?? "UTC");

  let nextOccurrences: DateOnly[] = [];
  if (rule.status === "active") {
    const from =
      domainRule.startDate > today ? domainRule.startDate : today;
    const horizon = addDays(from, 365);
    nextOccurrences = computeOccurrences(domainRule, from, horizon).slice(0, 3);
  }

  return {
    rule: domainRule,
    accountName: names?.account?.name ?? "",
    counterpartyAccountName: names?.counterpartyAccount?.name ?? null,
    categoryName: names?.category?.name ?? null,
    nextOccurrences,
    recentTransactions: transactions.map((t) => ({
      id: t.id,
      occurredOn: dateOnlyFromUtcDate(t.occurredOn),
      scheduledOn: t.scheduledOn ? dateOnlyFromUtcDate(t.scheduledOn) : null,
      amountCents: t.amountCents,
      currency: t.currency,
      description: t.description,
    })),
  };
}
