"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  createRecurringRuleSchema,
  type CreateRecurringRuleInput,
} from "@/features/recurring/schemas";
import { createRecurringRule as createRecurringRuleService } from "@/features/recurring/services";
import { recurringErrorToMessage, type ActionResult } from "./errors";

export async function createRecurringRuleAction(
  input: CreateRecurringRuleInput,
): Promise<ActionResult<{ ruleId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createRecurringRuleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const rule = await createRecurringRuleService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      type: parsed.data.type,
      amountCents: parsed.data.amountCents,
      accountId: parsed.data.accountId,
      counterpartyAccountId: parsed.data.counterpartyAccountId ?? null,
      categoryId: parsed.data.categoryId ?? null,
      description: parsed.data.description ?? null,
      frequency: parsed.data.frequency,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
    });
    revalidatePath("/transactions");
    revalidatePath("/transactions/recurring");
    revalidatePath("/dashboard");
    return { ok: true, data: { ruleId: rule.id } };
  } catch (err) {
    return { ok: false, error: recurringErrorToMessage(err) };
  }
}
