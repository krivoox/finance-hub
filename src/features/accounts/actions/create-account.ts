"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  createAccountSchema,
  type CreateAccountInput,
} from "@/features/accounts/schemas";
import { createAccount as createAccountService } from "@/features/accounts/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function createAccountAction(
  input: CreateAccountInput,
): Promise<ActionResult<{ accountId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const account = await createAccountService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      type: parsed.data.type,
      initialBalanceCents: parsed.data.initialBalanceCents,
      creditLimitCents: parsed.data.creditLimitCents,
    });
    revalidatePath("/accounts");
    revalidatePath("/", "layout");
    return { ok: true, data: { accountId: account.id } };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
