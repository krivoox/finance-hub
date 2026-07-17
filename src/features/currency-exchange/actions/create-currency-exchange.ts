"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  createCurrencyExchangeSchema,
  deleteCurrencyExchangeSchema,
  type CreateCurrencyExchangeInput,
  type DeleteCurrencyExchangeInput,
} from "@/features/currency-exchange/schemas";
import {
  createCurrencyExchange as createService,
  deleteCurrencyExchange as deleteService,
} from "@/features/currency-exchange/services";
import {
  CurrencyExchangeDomainError,
} from "@/features/currency-exchange/domain";
import { TransactionDomainError } from "@/features/transactions/domain";
import { WorkspaceDomainError } from "@/features/workspaces/domain";
import type { ActionResult } from "@/features/transactions/actions/errors";

function exchangeErrorToMessage(err: unknown): string {
  if (err instanceof CurrencyExchangeDomainError) return err.message;
  if (err instanceof TransactionDomainError) return err.message;
  if (err instanceof WorkspaceDomainError) return err.message;
  return "No pudimos completar el canje. Intentá de nuevo.";
}

export async function createCurrencyExchangeAction(
  input: CreateCurrencyExchangeInput,
): Promise<ActionResult<{ exchangeId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createCurrencyExchangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const exchange = await createService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      fromAccountId: parsed.data.fromAccountId,
      toAccountId: parsed.data.toAccountId,
      fromAmountCents: parsed.data.fromAmountCents,
      toAmountCents: parsed.data.toAmountCents,
      occurredOn: parsed.data.occurredOn,
      description: parsed.data.description ?? null,
    });
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true, data: { exchangeId: exchange.id } };
  } catch (err) {
    return { ok: false, error: exchangeErrorToMessage(err) };
  }
}

export async function deleteCurrencyExchangeAction(
  input: DeleteCurrencyExchangeInput,
): Promise<ActionResult<{ exchangeId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = deleteCurrencyExchangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const result = await deleteService({
      userId: session.user.id,
      exchangeId: parsed.data.exchangeId,
    });
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true, data: { exchangeId: result.id } };
  } catch (err) {
    return { ok: false, error: exchangeErrorToMessage(err) };
  }
}
