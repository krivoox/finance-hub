"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  createBudgetSchema,
  type CreateBudgetInput,
} from "@/features/budgets/schemas";
import { createBudget as createBudgetService } from "@/features/budgets/services";
import { budgetErrorToMessage, type ActionResult } from "./errors";

export async function createBudgetAction(
  input: CreateBudgetInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const result = await createBudgetService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      period: parsed.data.period,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      limitCents: parsed.data.limitCents,
      currency: parsed.data.currency,
      categoryIds: parsed.data.categoryIds,
    });
    revalidatePath("/budgets");
    revalidatePath("/", "layout");
    return { ok: true, data: { id: result.id } };
  } catch (err) {
    return { ok: false, error: budgetErrorToMessage(err) };
  }
}
