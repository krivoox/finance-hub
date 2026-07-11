"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  changeMemberRoleSchema,
  type ChangeMemberRoleInput,
} from "@/features/workspaces/schemas";
import { changeMemberRole } from "@/features/workspaces/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function changeMemberRoleAction(
  input: ChangeMemberRoleInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = changeMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await changeMemberRole({
      callerUserId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      targetUserId: parsed.data.userId,
      role: parsed.data.role,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
