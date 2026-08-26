import "server-only";
import {
  assertCanReadGoals,
  progressFillPercent,
  progressPercent,
} from "@/features/goals/domain";
import {
  requireGoalMembership,
  type GoalRecord,
} from "./require-goal-membership";

export type GoalDetail = GoalRecord & {
  progressPercent: number;
  progressFillPercent: number;
};

/**
 * SPEC-08 §5 — Fetch a single goal with derived `progressPercent`.
 */
export async function getGoal({
  userId,
  goalId,
}: {
  userId: string;
  goalId: string;
}): Promise<GoalDetail> {
  const { goal, membership } = await requireGoalMembership(userId, goalId);
  assertCanReadGoals(membership.role);

  return {
    ...goal,
    progressPercent: progressPercent(
      goal.currentAmountCents,
      goal.targetAmountCents,
    ),
    progressFillPercent: progressFillPercent(
      goal.currentAmountCents,
      goal.targetAmountCents,
    ),
  };
}
