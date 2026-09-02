"use server";

import { getSession } from "@/lib/session";
import {
  createBalanceAdjustmentSchema,
  type CreateBalanceAdjustmentInput,
} from "@/features/transactions/schemas";
import { createBalanceAdjustment as createBalanceAdjustmentService } from "@/features/transactions/services";
import { transactionErrorToMessage, type ActionResult } from "./errors";
import { revalidateMoneyPaths } from "./revalidate-money-paths";

export async function createBalanceAdjustmentAction(
  input: CreateBalanceAdjustmentInput,
): Promise<ActionResult<{ transactionId: string; signedEffect: number }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createBalanceAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const tx = await createBalanceAdjustmentService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      accountId: parsed.data.accountId,
      targetBalanceCents: parsed.data.targetBalanceCents,
      occurredOn: parsed.data.occurredOn,
      description: parsed.data.description ?? null,
      currency: parsed.data.currency,
    });
    revalidateMoneyPaths();
    return {
      ok: true,
      data: {
        transactionId: tx.id,
        signedEffect: tx.signedEffect,
      },
    };
  } catch (err) {
    return { ok: false, error: transactionErrorToMessage(err) };
  }
}
