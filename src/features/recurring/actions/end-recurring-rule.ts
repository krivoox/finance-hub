"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  ruleIdSchema,
  type RuleIdInput,
} from "@/features/recurring/schemas";
import { endRecurringRule as endRecurringRuleService } from "@/features/recurring/services";
import { recurringErrorToMessage, type ActionResult } from "./errors";

export async function endRecurringRuleAction(
  input: RuleIdInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = ruleIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await endRecurringRuleService({
      userId: session.user.id,
      ruleId: parsed.data.ruleId,
    });
    revalidatePath("/transactions");
    revalidatePath("/transactions/recurring");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: recurringErrorToMessage(err) };
  }
}
