import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanMutateGoals,
  assertDeleteGoalConfirmation,
} from "@/features/goals/domain";
import { requireGoalMembership } from "./require-goal-membership";

/**
 * SPEC-08 FR-09 / T-20 — Hard-delete a goal. GoalContribution rows cascade;
 * the contribution transfers stay in the ledger (money already moved).
 */
export async function deleteGoal({
  userId,
  goalId,
  confirmName,
}: {
  userId: string;
  goalId: string;
  confirmName: string;
}): Promise<void> {
  const { goal, membership } = await requireGoalMembership(userId, goalId);
  assertCanMutateGoals(membership.role);
  assertDeleteGoalConfirmation({
    goalName: goal.name,
    confirmName,
  });

  await prisma.goal.delete({ where: { id: goalId } });
}
