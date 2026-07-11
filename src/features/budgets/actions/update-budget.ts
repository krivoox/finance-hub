"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  updateBudgetSchema,
  type UpdateBudgetInput,
} from "@/features/budgets/schemas";
import { updateBudget as updateBudgetService } from "@/features/budgets/services";
import { budgetErrorToMessage, type ActionResult } from "./errors";

export async function updateBudgetAction(
  input: UpdateBudgetInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = updateBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const result = await updateBudgetService({
      userId: session.user.id,
      budgetId: parsed.data.budgetId,
      name: parsed.data.name,
      limitCents: parsed.data.limitCents,
      categoryIds: parsed.data.categoryIds,
    });
    revalidatePath("/budgets");
    return { ok: true, data: { id: result.id } };
  } catch (err) {
    return { ok: false, error: budgetErrorToMessage(err) };
  }
}
