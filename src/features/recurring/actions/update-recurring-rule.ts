"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  updateRecurringRuleSchema,
  type UpdateRecurringRuleInput,
} from "@/features/recurring/schemas";
import { updateRecurringRule as updateRecurringRuleService } from "@/features/recurring/services";
import { recurringErrorToMessage, type ActionResult } from "./errors";

export async function updateRecurringRuleAction(
  input: UpdateRecurringRuleInput,
): Promise<ActionResult<{ ruleId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = updateRecurringRuleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const rule = await updateRecurringRuleService({
      userId: session.user.id,
      ruleId: parsed.data.ruleId,
      name: parsed.data.name,
      amountCents: parsed.data.amountCents,
      accountId: parsed.data.accountId,
      counterpartyAccountId: parsed.data.counterpartyAccountId,
      categoryId: parsed.data.categoryId,
      description: parsed.data.description,
      frequency: parsed.data.frequency,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    });
    revalidatePath("/transactions");
    revalidatePath("/transactions/recurring");
    revalidatePath("/dashboard");
    return { ok: true, data: { ruleId: rule.id } };
  } catch (err) {
    return { ok: false, error: recurringErrorToMessage(err) };
  }
}
