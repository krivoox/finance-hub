import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanMutateRecurring,
  assertCanPause,
} from "@/features/recurring/domain";

import {
  RECURRING_SELECT,
  mapRecurringRow,
  requireRecurringMembership,
  type RecurringRuleRecord,
} from "./require-recurring-membership";

/**
 * SPEC-18 §4.4 — Pause an active recurring rule with `manual` reason.
 * Idempotent when already paused with `manual`. Ended is rejected.
 */
export async function pauseRecurringRule({
  userId,
  ruleId,
}: {
  userId: string;
  ruleId: string;
}): Promise<RecurringRuleRecord> {
  const { rule, membership } = await requireRecurringMembership(userId, ruleId);
  assertCanMutateRecurring(membership.role);

  if (rule.status === "paused" && rule.pausedReason === "manual") {
    return rule;
  }

  assertCanPause(rule);

  const updated = await prisma.recurringRule.update({
    where: { id: rule.id },
    data: { status: "paused", pausedReason: "manual" },
    select: RECURRING_SELECT,
  });
  return mapRecurringRow(updated);
}
