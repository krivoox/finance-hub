"use server";

import { getSession } from "@/lib/session";
import {
  contributeToGoalSchema,
  type ContributeToGoalInput,
} from "@/features/goals/schemas";
import { contributeToGoal as contributeToGoalService } from "@/features/goals/services";
import { revalidateMoneyPaths } from "@/features/transactions/actions/revalidate-money-paths";
import { goalErrorToMessage, type ActionResult } from "./errors";

export async function contributeToGoalAction(
  input: ContributeToGoalInput,
): Promise<
  ActionResult<{
    contributionId: string;
    transactionId: string;
    goalStatus: string;
  }>
> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = contributeToGoalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const { goal, contributionId, transactionId } =
      await contributeToGoalService({
        userId: session.user.id,
        goalId: parsed.data.goalId,
        fromAccountId: parsed.data.fromAccountId,
        amountCents: parsed.data.amountCents,
        contributedOn: parsed.data.contributedOn,
        note: parsed.data.note ?? null,
      });
    revalidateMoneyPaths({ goals: true });
    return {
      ok: true,
      data: {
        contributionId,
        transactionId,
        goalStatus: goal.status,
      },
    };
  } catch (err) {
    return { ok: false, error: goalErrorToMessage(err) };
  }
}
