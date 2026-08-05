"use server";

import { getSession } from "@/lib/session";
import {
  listRecurringRulesSchema,
  type ListRecurringRulesInput,
} from "@/features/recurring/schemas";
import {
  listRecurringRules as listRecurringRulesService,
  type RecurringRuleListItem,
} from "@/features/recurring/services";
import { recurringErrorToMessage, type ActionResult } from "./errors";

export async function listRecurringRulesAction(
  input: ListRecurringRulesInput,
): Promise<ActionResult<{ items: RecurringRuleListItem[] }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = listRecurringRulesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const items = await listRecurringRulesService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      status: parsed.data.status,
      type: parsed.data.type,
    });
    return { ok: true, data: { items } };
  } catch (err) {
    return { ok: false, error: recurringErrorToMessage(err) };
  }
}
