"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  updateTransactionSchema,
  type UpdateTransactionInput,
} from "@/features/transactions/schemas";
import { updateTransaction as updateTransactionService } from "@/features/transactions/services";
import { transactionErrorToMessage, type ActionResult } from "./errors";

export async function updateTransactionAction(
  input: UpdateTransactionInput,
): Promise<ActionResult<{ transactionId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const tx = await updateTransactionService({
      userId: session.user.id,
      transactionId: parsed.data.transactionId,
      amountCents: parsed.data.amountCents,
      occurredOn: parsed.data.occurredOn,
      description:
        parsed.data.description === undefined
          ? undefined
          : (parsed.data.description ?? null),
      categoryId:
        parsed.data.categoryId === undefined
          ? undefined
          : parsed.data.categoryId,
      accountId: parsed.data.accountId,
      counterpartyAccountId:
        parsed.data.counterpartyAccountId === undefined
          ? undefined
          : parsed.data.counterpartyAccountId,
    });
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true, data: { transactionId: tx.id } };
  } catch (err) {
    return { ok: false, error: transactionErrorToMessage(err) };
  }
}
