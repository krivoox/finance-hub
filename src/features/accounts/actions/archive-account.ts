"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  archiveAccountSchema,
  unarchiveAccountSchema,
  type ArchiveAccountInput,
  type UnarchiveAccountInput,
} from "@/features/accounts/schemas";
import {
  archiveAccount as archiveAccountService,
  unarchiveAccount as unarchiveAccountService,
} from "@/features/accounts/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function archiveAccountAction(
  input: ArchiveAccountInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = archiveAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await archiveAccountService({
      userId: session.user.id,
      accountId: parsed.data.accountId,
    });
    revalidatePath("/accounts");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}

export async function unarchiveAccountAction(
  input: UnarchiveAccountInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = unarchiveAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await unarchiveAccountService({
      userId: session.user.id,
      accountId: parsed.data.accountId,
    });
    revalidatePath("/accounts");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
