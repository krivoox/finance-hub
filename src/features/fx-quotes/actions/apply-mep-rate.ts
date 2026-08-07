"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  applyMepConsolidationRateSchema,
  type ApplyMepConsolidationRateInput,
} from "@/features/fx-quotes/schemas";
import { applyConsolidationRateFromMepQuote } from "@/features/fx-quotes/services";
import {
  FxQuotesDomainError,
} from "@/features/fx-quotes/domain";
import { WorkspaceDomainError } from "@/features/workspaces/domain";
import { TransactionDomainError } from "@/features/transactions/domain";
import type { ActionResult } from "@/features/transactions/actions/errors";

function toMessage(err: unknown): string {
  if (err instanceof FxQuotesDomainError) return err.message;
  if (err instanceof WorkspaceDomainError) return err.message;
  if (err instanceof TransactionDomainError) return err.message;
  return "No pudimos aplicar el MEP. Intentá de nuevo.";
}

export async function applyMepConsolidationRateAction(
  input: ApplyMepConsolidationRateInput,
): Promise<ActionResult<{ rateId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = applyMepConsolidationRateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const rate = await applyConsolidationRateFromMepQuote({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
    });
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return { ok: true, data: { rateId: rate.id } };
  } catch (err) {
    return { ok: false, error: toMessage(err) };
  }
}
