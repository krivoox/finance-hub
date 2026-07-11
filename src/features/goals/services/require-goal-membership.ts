import "server-only";
import { prisma } from "@/lib/prisma";
import {
  requireMembership,
  type MembershipContext,
} from "@/features/workspaces/services";
import {
  GoalNotFoundError,
  type GoalKind,
  type GoalStatus,
} from "@/features/goals/domain";

export type GoalRecord = {
  id: string;
  workspaceId: string;
  name: string;
  kind: GoalKind;
  targetAmountCents: number;
  currentAmountCents: number;
  currency: string;
  targetDate: Date | null;
  linkedAccountId: string | null;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
};

export const GOAL_SELECT = {
  id: true,
  workspaceId: true,
  name: true,
  kind: true,
  targetAmountCents: true,
  currentAmountCents: true,
  currency: true,
  targetDate: true,
  linkedAccountId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Loads a goal and verifies the caller's membership in its workspace.
 * Throws `GoalNotFoundError` for unknown ids (does not leak workspace ids).
 */
export async function requireGoalMembership(
  userId: string,
  goalId: string,
): Promise<{ goal: GoalRecord; membership: MembershipContext }> {
  const goal = (await prisma.goal.findUnique({
    where: { id: goalId },
    select: GOAL_SELECT,
  })) as GoalRecord | null;

  if (!goal) {
    throw new GoalNotFoundError(goalId);
  }

  const membership = await requireMembership(userId, goal.workspaceId);
  return { goal, membership };
}
