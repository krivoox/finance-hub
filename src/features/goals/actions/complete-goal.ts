"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  completeGoalSchema,
  type CompleteGoalInput,
} from "@/features/goals/schemas";
import { completeGoal as completeGoalService } from "@/features/goals/services";
import { goalErrorToMessage, type ActionResult } from "./errors";

export async function completeGoalAction(
  input: CompleteGoalInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = completeGoalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await completeGoalService({
      userId: session.user.id,
      goalId: parsed.data.goalId,
    });
    revalidatePath("/goals");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: goalErrorToMessage(err) };
  }
}
