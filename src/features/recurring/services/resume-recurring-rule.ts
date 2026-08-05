import "server-only";
import { prisma } from "@/lib/prisma";
import {
  AccountArchivedError,
} from "@/features/transactions/domain";
import {
  assertCanMutateRecurring,
  canResume,
  todayDateOnly,
} from "@/features/recurring/domain";

import {
  RECURRING_SELECT,
  mapRecurringRow,
  requireRecurringMembership,
  type RecurringRuleRecord,
} from "./require-recurring-membership";
import { toDomainRule } from "./utils";

/**
 * SPEC-18 §4.4 / T-28 — Resume a paused rule. Rejects when accounts became
 * archived while paused.
 */
export async function resumeRecurringRule({
  userId,
  ruleId,
}: {
  userId: string;
  ruleId: string;
}): Promise<RecurringRuleRecord> {
  const { rule, membership } = await requireRecurringMembership(userId, ruleId);
  assertCanMutateRecurring(membership.role);

  const [user, account, counterparty] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    }),
    prisma.financeAccount.findUnique({
      where: { id: rule.accountId },
      select: { isArchived: true },
    }),
    rule.counterpartyAccountId
      ? prisma.financeAccount.findUnique({
          where: { id: rule.counterpartyAccountId },
          select: { isArchived: true },
        })
      : Promise.resolve(null),
  ]);

  const today = todayDateOnly(new Date(), user?.timezone ?? "UTC");
  canResume(toDomainRule(rule), today);

  if (account?.isArchived) throw new AccountArchivedError();
  if (counterparty?.isArchived) throw new AccountArchivedError();

  const updated = await prisma.recurringRule.update({
    where: { id: rule.id },
    data: { status: "active", pausedReason: null },
    select: RECURRING_SELECT,
  });
  return mapRecurringRow(updated);
}
