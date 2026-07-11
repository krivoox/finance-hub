"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  cancelGoalSchema,
  type CancelGoalInput,
} from "@/features/goals/schemas";
import { cancelGoal as cancelGoalService } from "@/features/goals/services";
import { goalErrorToMessage, type ActionResult } from "./errors";

export async function cancelGoalAction(
  input: CancelGoalInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = cancelGoalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await cancelGoalService({
      userId: session.user.id,
      goalId: parsed.data.goalId,
    });
    revalidatePath("/goals");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: goalErrorToMessage(err) };
  }
}
