"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  deleteAccountSchema,
  type DeleteAccountInput,
} from "@/features/accounts/schemas";
import { deleteAccount as deleteAccountService } from "@/features/accounts/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function deleteAccountAction(
  input: DeleteAccountInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await deleteAccountService({
      userId: session.user.id,
      accountId: parsed.data.accountId,
      confirmName: parsed.data.confirmName,
    });
    revalidatePath("/accounts");
    revalidatePath("/transactions");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
