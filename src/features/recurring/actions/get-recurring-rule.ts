"use server";

import { getSession } from "@/lib/session";
import {
  getRecurringRuleSchema,
  type GetRecurringRuleInput,
} from "@/features/recurring/schemas";
import {
  getRecurringRule as getRecurringRuleService,
  type RecurringRuleDetail,
} from "@/features/recurring/services";
import { recurringErrorToMessage, type ActionResult } from "./errors";

export async function getRecurringRuleAction(
  input: GetRecurringRuleInput,
): Promise<ActionResult<RecurringRuleDetail>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = getRecurringRuleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const detail = await getRecurringRuleService({
      userId: session.user.id,
      ruleId: parsed.data.ruleId,
    });
    return { ok: true, data: detail };
  } catch (err) {
    return { ok: false, error: recurringErrorToMessage(err) };
  }
}
