"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  createCrossWorkspaceContributionSchema,
  type CreateCrossWorkspaceContributionInput,
} from "@/features/transactions/schemas";
import { createCrossWorkspaceContribution as createContributionService } from "@/features/transactions/services/create-cross-workspace-contribution";
import { transactionErrorToMessage, type ActionResult } from "./errors";

export async function createCrossWorkspaceContributionAction(
  input: CreateCrossWorkspaceContributionInput,
): Promise<ActionResult<{ sourceTransactionId: string; targetTransactionId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createCrossWorkspaceContributionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const result = await createContributionService({
      userId: session.user.id,
      sourceAccountId: parsed.data.sourceAccountId,
      targetAccountId: parsed.data.targetAccountId,
      amountCents: parsed.data.amountCents,
      occurredOn: parsed.data.occurredOn,
      description: parsed.data.description ?? null,
    });
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/groups");
    revalidatePath("/", "layout");
    return {
      ok: true,
      data: {
        sourceTransactionId: result.source.id,
        targetTransactionId: result.target.id,
      },
    };
  } catch (err) {
    return { ok: false, error: transactionErrorToMessage(err) };
  }
}
