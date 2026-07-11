"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  updateAccountSchema,
  type UpdateAccountInput,
} from "@/features/accounts/schemas";
import { updateAccount as updateAccountService } from "@/features/accounts/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function updateAccountAction(
  input: UpdateAccountInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await updateAccountService({
      userId: session.user.id,
      accountId: parsed.data.accountId,
      name: parsed.data.name,
      creditLimitCents: parsed.data.creditLimitCents,
    });
    revalidatePath("/accounts");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
