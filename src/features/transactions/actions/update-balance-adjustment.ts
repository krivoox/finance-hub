"use server";

import { getSession } from "@/lib/session";
import {
  updateBalanceAdjustmentSchema,
  type UpdateBalanceAdjustmentInput,
} from "@/features/transactions/schemas";
import { updateBalanceAdjustment as updateBalanceAdjustmentService } from "@/features/transactions/services";
import { transactionErrorToMessage, type ActionResult } from "./errors";
import { revalidateMoneyPaths } from "./revalidate-money-paths";

export async function updateBalanceAdjustmentAction(
  input: UpdateBalanceAdjustmentInput,
): Promise<ActionResult<{ transactionId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = updateBalanceAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const tx = await updateBalanceAdjustmentService({
      userId: session.user.id,
      transactionId: parsed.data.transactionId,
      targetBalanceCents: parsed.data.targetBalanceCents,
      occurredOn: parsed.data.occurredOn,
      description: parsed.data.description ?? null,
    });
    revalidateMoneyPaths();
    return { ok: true, data: { transactionId: tx.id } };
  } catch (err) {
    return { ok: false, error: transactionErrorToMessage(err) };
  }
}
