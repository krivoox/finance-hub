"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  removeMemberSchema,
  type RemoveMemberInput,
} from "@/features/workspaces/schemas";
import { removeMember } from "@/features/workspaces/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function removeMemberAction(
  input: RemoveMemberInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await removeMember({
      callerUserId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      targetUserId: parsed.data.userId,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
