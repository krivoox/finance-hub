"use server";

import { getSession } from "@/lib/session";
import {
  listPendingOccurrencesSchema,
  type ListPendingOccurrencesInput,
} from "@/features/recurring/schemas";
import {
  listPendingOccurrences as listPendingOccurrencesService,
  type PendingOccurrence,
} from "@/features/recurring/services";
import { recurringErrorToMessage, type ActionResult } from "./errors";

export async function listPendingOccurrencesAction(
  input: ListPendingOccurrencesInput,
): Promise<ActionResult<{ items: PendingOccurrence[] }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = listPendingOccurrencesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const items = await listPendingOccurrencesService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      horizonDays: parsed.data.horizonDays,
    });
    return { ok: true, data: { items } };
  } catch (err) {
    return { ok: false, error: recurringErrorToMessage(err) };
  }
}
