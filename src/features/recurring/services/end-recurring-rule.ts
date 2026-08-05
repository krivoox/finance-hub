import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanEnd,
  assertCanMutateRecurring,
} from "@/features/recurring/domain";

import {
  RECURRING_SELECT,
  mapRecurringRow,
  requireRecurringMembership,
  type RecurringRuleRecord,
} from "./require-recurring-membership";

/**
 * SPEC-18 §4.4 / T-25 — Soft-delete a recurring rule. Terminal state.
 * Materialized transactions keep their FK; tooltips resolve `name`.
 */
export async function endRecurringRule({
  userId,
  ruleId,
}: {
  userId: string;
  ruleId: string;
}): Promise<RecurringRuleRecord> {
  const { rule, membership } = await requireRecurringMembership(userId, ruleId);
  assertCanMutateRecurring(membership.role);

  if (rule.status === "ended") return rule;

  assertCanEnd(rule);

  const updated = await prisma.recurringRule.update({
    where: { id: rule.id },
    data: {
      status: "ended",
      pausedReason: null,
      endedAt: new Date(),
    },
    select: RECURRING_SELECT,
  });
  return mapRecurringRow(updated);
}
