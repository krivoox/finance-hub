"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  upsertConsolidationRateSchema,
  type UpsertConsolidationRateInput,
} from "@/features/currency-exchange/schemas";
import { upsertConsolidationRate as upsertService } from "@/features/currency-exchange/services";
import {
  ConsolidationRateDomainError,
} from "@/features/dashboard/domain/consolidation";
import { WorkspaceDomainError } from "@/features/workspaces/domain";
import type { ActionResult } from "@/features/transactions/actions/errors";

function rateErrorToMessage(err: unknown): string {
  if (err instanceof ConsolidationRateDomainError) return err.message;
  if (err instanceof WorkspaceDomainError) return err.message;
  return "No pudimos guardar la tasa. Intentá de nuevo.";
}

export async function upsertConsolidationRateAction(
  input: UpsertConsolidationRateInput,
): Promise<ActionResult<{ rateId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = upsertConsolidationRateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const rate = await upsertService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      arsPerUsd: parsed.data.arsPerUsd,
      quoteCurrency: parsed.data.quoteCurrency,
      label: parsed.data.label,
      asOf: parsed.data.asOf,
    });
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return { ok: true, data: { rateId: rate.id } };
  } catch (err) {
    return { ok: false, error: rateErrorToMessage(err) };
  }
}
