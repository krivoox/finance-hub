"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  materializeRecurringOccurrenceSchema,
  type MaterializeRecurringOccurrenceInput,
} from "@/features/recurring/schemas";
import { materializeRecurringOccurrence as materializeService } from "@/features/recurring/services";
import { recurringErrorToMessage, type ActionResult } from "./errors";

export type MaterializeActionData = {
  transactionId: string;
  possibleDuplicates: {
    id: string;
    amountCents: number;
    occurredOn: string;
  }[];
};

export async function materializeRecurringOccurrenceAction(
  input: MaterializeRecurringOccurrenceInput,
): Promise<ActionResult<MaterializeActionData>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = materializeRecurringOccurrenceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const result = await materializeService({
      userId: session.user.id,
      ruleId: parsed.data.ruleId,
      scheduledOn: parsed.data.scheduledOn,
      overrides: parsed.data.overrides,
    });
    revalidatePath("/transactions");
    revalidatePath("/transactions/recurring");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return {
      ok: true,
      data: {
        transactionId: result.transaction.id,
        possibleDuplicates: result.possibleDuplicates.map((d) => ({
          id: d.id,
          amountCents: d.amountCents,
          occurredOn: d.occurredOn,
        })),
      },
    };
  } catch (err) {
    return { ok: false, error: recurringErrorToMessage(err) };
  }
}
