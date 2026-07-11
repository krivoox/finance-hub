"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  archiveBudgetSchema,
  unarchiveBudgetSchema,
  type ArchiveBudgetInput,
  type UnarchiveBudgetInput,
} from "@/features/budgets/schemas";
import {
  archiveBudget as archiveBudgetService,
  unarchiveBudget as unarchiveBudgetService,
} from "@/features/budgets/services";
import { budgetErrorToMessage, type ActionResult } from "./errors";

export async function archiveBudgetAction(
  input: ArchiveBudgetInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = archiveBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await archiveBudgetService({
      userId: session.user.id,
      budgetId: parsed.data.budgetId,
    });
    revalidatePath("/budgets");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: budgetErrorToMessage(err) };
  }
}

export async function unarchiveBudgetAction(
  input: UnarchiveBudgetInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = unarchiveBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await unarchiveBudgetService({
      userId: session.user.id,
      budgetId: parsed.data.budgetId,
    });
    revalidatePath("/budgets");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: budgetErrorToMessage(err) };
  }
}
