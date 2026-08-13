"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  deleteGoalSchema,
  type DeleteGoalInput,
} from "@/features/goals/schemas";
import { deleteGoal as deleteGoalService } from "@/features/goals/services";
import { goalErrorToMessage, type ActionResult } from "./errors";

export async function deleteGoalAction(
  input: DeleteGoalInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = deleteGoalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await deleteGoalService({
      userId: session.user.id,
      goalId: parsed.data.goalId,
      confirmName: parsed.data.confirmName,
    });
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: goalErrorToMessage(err) };
  }
}
