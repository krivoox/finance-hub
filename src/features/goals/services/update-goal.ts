import "server-only";
import { prisma } from "@/lib/prisma";
import {
  applyGoalTargetChange,
  assertCanMutateGoals,
  assertCanUpdateGoal,
  assertLinkedAccountForGoal,
  assertValidGoalName,
  normalizeGoalName,
  type GoalKind,
} from "@/features/goals/domain";
import { parseDateOnly } from "./utils";
import {
  GOAL_SELECT,
  requireGoalMembership,
  type GoalRecord,
} from "./require-goal-membership";

export type UpdateGoalServiceInput = {
  userId: string;
  goalId: string;
  name?: string;
  kind?: GoalKind;
  targetAmountCents?: number;
  /** `undefined` = leave. `null` = clear. */
  targetDate?: string | null;
  /** `undefined` = leave. `null` = unlink. */
  linkedAccountId?: string | null;
};

/**
 * SPEC-08 FR-08 / T-17 / T-18 / T-19 — Update mutable goal fields.
 * Currency is immutable (not in this command). Cancelled goals are rejected.
 */
export async function updateGoal(
  input: UpdateGoalServiceInput,
): Promise<GoalRecord> {
  const { goal, membership } = await requireGoalMembership(
    input.userId,
    input.goalId,
  );
  assertCanMutateGoals(membership.role);
  assertCanUpdateGoal(goal.status);

  const data: {
    name?: string;
    kind?: GoalKind;
    targetAmountCents?: number;
    targetDate?: Date | null;
    linkedAccountId?: string | null;
    status?: GoalRecord["status"];
  } = {};

  if (input.name !== undefined) {
    const name = normalizeGoalName(input.name);
    assertValidGoalName(name);
    data.name = name;
  }

  if (input.kind !== undefined) {
    data.kind = input.kind;
  }

  if (input.targetAmountCents !== undefined) {
    const { newStatus } = applyGoalTargetChange(
      {
        currentAmountCents: goal.currentAmountCents,
        status: goal.status,
      },
      input.targetAmountCents,
    );
    data.targetAmountCents = input.targetAmountCents;
    data.status = newStatus;
  }

  if (input.targetDate !== undefined) {
    data.targetDate =
      input.targetDate == null || input.targetDate === ""
        ? null
        : parseDateOnly(input.targetDate);
  }

  if (input.linkedAccountId !== undefined) {
    if (input.linkedAccountId === null || input.linkedAccountId === "") {
      data.linkedAccountId = null;
    } else {
      const account = await prisma.financeAccount.findUnique({
        where: { id: input.linkedAccountId },
        select: {
          id: true,
          workspaceId: true,
          currency: true,
          isArchived: true,
        },
      });
      assertLinkedAccountForGoal({
        account,
        goalWorkspaceId: goal.workspaceId,
        goalCurrency: goal.currency,
      });
      data.linkedAccountId = input.linkedAccountId;
    }
  }

  if (Object.keys(data).length === 0) return goal;

  const updated = (await prisma.goal.update({
    where: { id: input.goalId },
    data,
    select: GOAL_SELECT,
  })) as GoalRecord;

  return updated;
}
