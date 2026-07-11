"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  acceptInvitationSchema,
  type AcceptInvitationInput,
} from "@/features/workspaces/schemas";
import { acceptInvitation } from "@/features/workspaces/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function acceptInvitationAction(
  input: AcceptInvitationInput,
): Promise<ActionResult<{ workspaceId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Token inválido",
    };
  }

  try {
    const result = await acceptInvitation({
      userId: session.user.id,
      token: parsed.data.token,
    });
    revalidatePath("/", "layout");
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
