"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  createGoalSchema,
  type CreateGoalInput,
} from "@/features/goals/schemas";
import { createGoal as createGoalService } from "@/features/goals/services";
import { goalErrorToMessage, type ActionResult } from "./errors";

export async function createGoalAction(
  input: CreateGoalInput,
): Promise<ActionResult<{ goalId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createGoalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const goal = await createGoalService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      targetAmountCents: parsed.data.targetAmountCents,
      currency: parsed.data.currency,
      targetDate: parsed.data.targetDate ?? null,
      linkedAccountId: parsed.data.linkedAccountId ?? null,
    });
    revalidatePath("/goals");
    return { ok: true, data: { goalId: goal.id } };
  } catch (err) {
    return { ok: false, error: goalErrorToMessage(err) };
  }
}
