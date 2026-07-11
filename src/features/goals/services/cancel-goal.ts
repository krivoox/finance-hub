import "server-only";
import { prisma } from "@/lib/prisma";
import { assertCanMutateGoals } from "@/features/goals/domain";
import {
  GOAL_SELECT,
  requireGoalMembership,
  type GoalRecord,
} from "./require-goal-membership";

/**
 * SPEC-08 FR-05 / T-04 — Cancel a goal. Idempotent when already cancelled.
 * A completed goal can still be cancelled; that is treated as manual archival.
 */
export async function cancelGoal({
  userId,
  goalId,
}: {
  userId: string;
  goalId: string;
}): Promise<GoalRecord> {
  const { goal, membership } = await requireGoalMembership(userId, goalId);
  assertCanMutateGoals(membership.role);

  if (goal.status === "cancelled") return goal;

  const updated = (await prisma.goal.update({
    where: { id: goalId },
    data: { status: "cancelled" },
    select: GOAL_SELECT,
  })) as GoalRecord;

  return updated;
}
