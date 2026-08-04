import "server-only";
import { prisma } from "@/lib/prisma";
import {
  applyContribution,
  assertCanMutateGoals,
  assertGoalContributionTransferAccounts,
} from "@/features/goals/domain";
import {
  assertOccurredOnNotTooFuture,
  normalizeDescription,
  TransactionDomainError,
} from "@/features/transactions/domain";
import { parseDateOnly } from "./utils";
import {
  GOAL_SELECT,
  requireGoalMembership,
  type GoalRecord,
} from "./require-goal-membership";

export type ContributeToGoalServiceInput = {
  userId: string;
  goalId: string;
  fromAccountId: string;
  amountCents: number;
  contributedOn: string;
  note?: string | null;
};

export type ContributeToGoalResult = {
  goal: GoalRecord;
  contributionId: string;
  transactionId: string;
};

/**
 * SPEC-08 FR-02 / H4 — Register a contribution as a transfer
 * (fromAccount → goal.linkedAccountId) + GoalContribution + currentAmount
 * update, atomically.
 */
export async function contributeToGoal(
  input: ContributeToGoalServiceInput,
): Promise<ContributeToGoalResult> {
  const { goal, membership } = await requireGoalMembership(
    input.userId,
    input.goalId,
  );
  assertCanMutateGoals(membership.role);

  const { newCurrentAmountCents, newStatus } = applyContribution(
    {
      currentAmountCents: goal.currentAmountCents,
      targetAmountCents: goal.targetAmountCents,
      status: goal.status,
    },
    input.amountCents,
  );

  const accountIds = [input.fromAccountId];
  if (goal.linkedAccountId) {
    accountIds.push(goal.linkedAccountId);
  }

  const [accounts, user] = await Promise.all([
    prisma.financeAccount.findMany({
      where: { id: { in: accountIds } },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { timezone: true },
    }),
  ]);

  const byId = new Map(accounts.map((a) => [a.id, a]));
  const fromAccount = byId.get(input.fromAccountId);
  if (!fromAccount) {
    throw new TransactionDomainError("La cuenta de origen no existe");
  }
  const linkedAccount = goal.linkedAccountId
    ? (byId.get(goal.linkedAccountId) ?? null)
    : null;

  const { fromAccountId, toAccountId } = assertGoalContributionTransferAccounts(
    {
      goalWorkspaceId: goal.workspaceId,
      goalCurrency: goal.currency,
      linkedAccountId: goal.linkedAccountId,
      fromAccountId: input.fromAccountId,
      fromAccount,
      linkedAccount,
    },
  );

  const contributedOn = parseDateOnly(input.contributedOn);
  assertOccurredOnNotTooFuture(contributedOn, new Date(), user?.timezone);

  const note = normalizeDescription(input.note ?? null);
  const description =
    note ?? `Aporte a objetivo: ${goal.name}`;

  const { updated, contribution, transfer } = await prisma.$transaction(
    async (tx) => {
      const transfer = await tx.transaction.create({
        data: {
          workspaceId: goal.workspaceId,
          type: "transfer",
          amountCents: input.amountCents,
          currency: fromAccount.currency,
          occurredOn: contributedOn,
          description,
          categoryId: null,
          accountId: fromAccountId,
          counterpartyAccountId: toAccountId,
          createdByUserId: input.userId,
        },
        select: { id: true },
      });

      const contribution = await tx.goalContribution.create({
        data: {
          goalId: goal.id,
          amountCents: input.amountCents,
          contributedOn,
          note,
          createdByUserId: input.userId,
          transactionId: transfer.id,
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

      return { updated, contribution, transfer };
    },
  );

  return {
    goal: updated,
    contributionId: contribution.id,
    transactionId: transfer.id,
  };
}
