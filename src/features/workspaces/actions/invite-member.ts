"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  inviteMemberSchema,
  type InviteMemberInput,
} from "@/features/workspaces/schemas";
import { inviteMember } from "@/features/workspaces/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function inviteMemberAction(
  input: InviteMemberInput,
): Promise<ActionResult<{ invitationId: string; token: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const invitation = await inviteMember({
      callerUserId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      email: parsed.data.email,
      role: parsed.data.role,
    });
    revalidatePath("/", "layout");
    return {
      ok: true,
      data: { invitationId: invitation.id, token: invitation.token },
    };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
