"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  transferOwnershipSchema,
  type TransferOwnershipInput,
} from "@/features/workspaces/schemas";
import { transferOwnership } from "@/features/workspaces/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function transferOwnershipAction(
  input: TransferOwnershipInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = transferOwnershipSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await transferOwnership({
      callerUserId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      newOwnerUserId: parsed.data.newOwnerUserId,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
