import "server-only";
import { prisma } from "@/lib/prisma";
import {
  GoalDomainError,
  assertCanMutateGoals,
} from "@/features/goals/domain";
import {
  GOAL_SELECT,
  requireGoalMembership,
  type GoalRecord,
} from "./require-goal-membership";

/**
 * SPEC-08 FR-04 — Manually mark a goal as completed. Useful for `debt_payoff`
 * goals whose "payment" is not recorded via contributions in MVP.
 *
 * Only `active` goals can be manually completed. Cancelled goals must be
 * re-activated first (out of scope in MVP).
 */
export async function completeGoal({
  userId,
  goalId,
}: {
  userId: string;
  goalId: string;
}): Promise<GoalRecord> {
  const { goal, membership } = await requireGoalMembership(userId, goalId);
  assertCanMutateGoals(membership.role);

  if (goal.status === "completed") return goal;
  if (goal.status === "cancelled") {
    throw new GoalDomainError(
      "No podés completar un objetivo cancelado",
    );
  }

  const updated = (await prisma.goal.update({
    where: { id: goalId },
    data: { status: "completed" },
    select: GOAL_SELECT,
  })) as GoalRecord;

  return updated;
}
