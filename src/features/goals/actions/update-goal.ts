"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  updateGoalSchema,
  type UpdateGoalInput,
} from "@/features/goals/schemas";
import { updateGoal as updateGoalService } from "@/features/goals/services";
import { goalErrorToMessage, type ActionResult } from "./errors";

export async function updateGoalAction(
  input: UpdateGoalInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = updateGoalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await updateGoalService({
      userId: session.user.id,
      goalId: parsed.data.goalId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      targetAmountCents: parsed.data.targetAmountCents,
      targetDate: parsed.data.targetDate,
      linkedAccountId: parsed.data.linkedAccountId,
    });
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: goalErrorToMessage(err) };
  }
}
