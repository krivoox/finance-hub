import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  GoalLinkedAccountInvalidError,
  assertCanMutateGoals,
  assertGoalCurrencyAllowed,
  assertValidGoalName,
  assertValidTargetAmount,
  normalizeGoalName,
  type GoalKind,
} from "@/features/goals/domain";
import { parseDateOnly } from "./utils";
import { GOAL_SELECT, type GoalRecord } from "./require-goal-membership";

export type CreateGoalServiceInput = {
  userId: string;
  workspaceId: string;
  name: string;
  kind: GoalKind;
  targetAmountCents: number;
  currency?: string;
  targetDate?: string | null;
  linkedAccountId?: string | null;
};

/**
 * SPEC-08 FR-01 — Create a goal inside the caller's workspace.
 *
 * Domain guards run first so we surface user-friendly errors before hitting
 * Postgres. Currency defaults to workspace baseCurrency; ARS|USD allowed
 * (ADR-006). Linked account must match goal currency.
 */
export async function createGoal(
  input: CreateGoalServiceInput,
): Promise<GoalRecord> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateGoals(role);

  const name = normalizeGoalName(input.name);
  assertValidGoalName(name);
  assertValidTargetAmount(input.targetAmountCents);

  const targetDate =
    input.targetDate == null || input.targetDate === ""
      ? null
      : parseDateOnly(input.targetDate);

  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { baseCurrency: true },
  });
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  const currency = input.currency ?? workspace.baseCurrency;
  assertGoalCurrencyAllowed(currency);

  let linkedAccountId: string | null = null;
  if (input.linkedAccountId) {
    const account = await prisma.financeAccount.findUnique({
      where: { id: input.linkedAccountId },
      select: {
        id: true,
        workspaceId: true,
        currency: true,
        isArchived: true,
      },
    });
    if (!account) {
      throw new GoalLinkedAccountInvalidError(
        "La cuenta vinculada no existe",
      );
    }
    if (account.workspaceId !== input.workspaceId) {
      throw new GoalLinkedAccountInvalidError(
        "La cuenta vinculada pertenece a otro workspace",
      );
    }
    if (account.isArchived) {
      throw new GoalLinkedAccountInvalidError(
        "No podés vincular una cuenta archivada",
      );
    }
    if (account.currency !== currency) {
      throw new GoalLinkedAccountInvalidError(
        "La cuenta vinculada usa otra moneda",
      );
    }
    linkedAccountId = account.id;
  }

  const created = (await prisma.goal.create({
    data: {
      workspaceId: input.workspaceId,
      name,
      kind: input.kind,
      targetAmountCents: input.targetAmountCents,
      currentAmountCents: 0,
      currency,
      targetDate,
      linkedAccountId,
      status: "active",
    },
    select: GOAL_SELECT,
  })) as GoalRecord;

  return created;
}
