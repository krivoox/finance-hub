"use server";

import { getSession } from "@/lib/session";
import {
  createTransferSchema,
  type CreateTransferInput,
} from "@/features/transactions/schemas";
import { createTransfer as createTransferService } from "@/features/transactions/services";
import { transactionErrorToMessage, type ActionResult } from "./errors";
import { revalidateMoneyPaths } from "./revalidate-money-paths";

export async function createTransferAction(
  input: CreateTransferInput,
): Promise<ActionResult<{ transactionId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createTransferSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const tx = await createTransferService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      accountId: parsed.data.accountId,
      counterpartyAccountId: parsed.data.counterpartyAccountId,
      amountCents: parsed.data.amountCents,
      occurredOn: parsed.data.occurredOn,
      description: parsed.data.description ?? null,
      currency: parsed.data.currency,
    });
    revalidateMoneyPaths();
    return { ok: true, data: { transactionId: tx.id } };
  } catch (err) {
    return { ok: false, error: transactionErrorToMessage(err) };
  }
}
