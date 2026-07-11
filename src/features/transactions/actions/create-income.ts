"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  createIncomeSchema,
  type CreateIncomeInput,
} from "@/features/transactions/schemas";
import { createIncome as createIncomeService } from "@/features/transactions/services";
import { transactionErrorToMessage, type ActionResult } from "./errors";

export async function createIncomeAction(
  input: CreateIncomeInput,
): Promise<ActionResult<{ transactionId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createIncomeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const tx = await createIncomeService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      accountId: parsed.data.accountId,
      categoryId: parsed.data.categoryId,
      amountCents: parsed.data.amountCents,
      occurredOn: parsed.data.occurredOn,
      description: parsed.data.description ?? null,
    });
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true, data: { transactionId: tx.id } };
  } catch (err) {
    return { ok: false, error: transactionErrorToMessage(err) };
  }
}
