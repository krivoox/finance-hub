"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  deleteTransactionSchema,
  type DeleteTransactionInput,
} from "@/features/transactions/schemas";
import { deleteTransaction as deleteTransactionService } from "@/features/transactions/services";
import { transactionErrorToMessage, type ActionResult } from "./errors";

export async function deleteTransactionAction(
  input: DeleteTransactionInput,
): Promise<ActionResult<{ transactionId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = deleteTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const result = await deleteTransactionService({
      userId: session.user.id,
      transactionId: parsed.data.transactionId,
    });
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
    return { ok: true, data: { transactionId: result.id } };
  } catch (err) {
    return { ok: false, error: transactionErrorToMessage(err) };
  }
}
