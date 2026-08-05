import "server-only";
import { prisma } from "@/lib/prisma";
import {
  requireMembership,
  type MembershipContext,
} from "@/features/workspaces/services";
import {
  RecurringRuleNotFoundError,
  type RecurringFrequency,
  type RecurringPausedReason,
  type RecurringRuleStatus,
  type RecurringRuleType,
} from "@/features/recurring/domain";

export type RecurringRuleRecord = {
  id: string;
  workspaceId: string;
  name: string;
  type: RecurringRuleType;
  amountCents: number;
  currency: string;
  accountId: string;
  counterpartyAccountId: string | null;
  categoryId: string | null;
  description: string | null;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate: Date | null;
  status: RecurringRuleStatus;
  pausedReason: RecurringPausedReason | null;
  createdByUserId: string;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const RECURRING_SELECT = {
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
} as const;

/**
 * Loads a recurring rule and verifies the caller's membership in its workspace.
 * Throws `RecurringRuleNotFoundError` on unknown ids (no workspace leak).
 */
export async function requireRecurringMembership(
  userId: string,
  ruleId: string,
): Promise<{
  rule: RecurringRuleRecord;
  membership: MembershipContext;
}> {
  const row = await prisma.recurringRule.findUnique({
    where: { id: ruleId },
    select: RECURRING_SELECT,
  });
  if (!row) {
    throw new RecurringRuleNotFoundError(ruleId);
  }
  const rule = mapRecurringRow(row);
  const membership = await requireMembership(userId, rule.workspaceId);
  return { rule, membership };
}

/**
 * Narrow the Prisma row to `RecurringRuleRecord` (enums as branded strings).
 */
export function mapRecurringRow(row: {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  amountCents: number;
  currency: string;
  accountId: string;
  counterpartyAccountId: string | null;
  categoryId: string | null;
  description: string | null;
  frequency: string;
  startDate: Date;
  endDate: Date | null;
  status: string;
  pausedReason: string | null;
  createdByUserId: string;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): RecurringRuleRecord {
  return {
    ...row,
    type: row.type as RecurringRuleType,
    frequency: row.frequency as RecurringFrequency,
    status: row.status as RecurringRuleStatus,
    pausedReason: (row.pausedReason as RecurringPausedReason | null) ?? null,
  };
}
