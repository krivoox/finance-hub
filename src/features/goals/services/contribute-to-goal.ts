import "server-only";
import { prisma } from "@/lib/prisma";
import {
  applyContribution,
  assertCanMutateGoals,
} from "@/features/goals/domain";
import { parseDateOnly } from "./utils";
import {
  GOAL_SELECT,
  requireGoalMembership,
  type GoalRecord,
} from "./require-goal-membership";

export type ContributeToGoalServiceInput = {
  userId: string;
  goalId: string;
  amountCents: number;
  contributedOn: string;
  note?: string | null;
};

export type ContributeToGoalResult = {
  goal: GoalRecord;
  contributionId: string;
};

/**
 * SPEC-08 FR-02 / FR-04 — Register a contribution and advance the goal's
 * `currentAmount`. Auto-completes the goal when `current >= target`.
 *
 * In MVP the contribution does NOT create a Transaction (SPEC-08 §4). It
 * runs inside a single Postgres transaction so the `currentAmountCents`
 * update and the `GoalContribution` insert stay consistent.
 */
export async function contributeToGoal(
  input: ContributeToGoalServiceInput,
): Promise<ContributeToGoalResult> {
  const { goal, membership } = await requireGoalMembership(
    input.userId,
    input.goalId,
  );
  assertCanMutateGoals(membership.role);

  // Domain runs first so we reject invalid amounts and non-active goals
  // without touching Postgres.
  const { newCurrentAmountCents, newStatus } = applyContribution(
    {
      currentAmountCents: goal.currentAmountCents,
      targetAmountCents: goal.targetAmountCents,
      status: goal.status,
    },
    input.amountCents,
  );

  const contributedOn = parseDateOnly(input.contributedOn);
  const note = input.note?.trim() ? input.note.trim() : null;

  const { updated, contribution } = await prisma.$transaction(async (tx) => {
    const contribution = await tx.goalContribution.create({
      data: {
        goalId: goal.id,
        amountCents: input.amountCents,
        contributedOn,
        note,
        createdByUserId: input.userId,
      },
      select: { id: true },
    });
    const updated = (await tx.goal.update({
      where: { id: goal.id },
      data: {
        currentAmountCents: newCurrentAmountCents,
        status: newStatus,
      },
      select: GOAL_SELECT,
    })) as GoalRecord;
    return { updated, contribution };
  });

  return { goal: updated, contributionId: contribution.id };
}
