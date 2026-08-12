"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  leaveGroupWorkspaceSchema,
  type LeaveGroupWorkspaceInput,
} from "@/features/workspaces/schemas";
import { leaveGroupWorkspace } from "@/features/workspaces/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function leaveGroupWorkspaceAction(
  input: LeaveGroupWorkspaceInput,
): Promise<ActionResult<{ nextActiveWorkspaceId: string | null }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = leaveGroupWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const result = await leaveGroupWorkspace({
      callerUserId: session.user.id,
      workspaceId: parsed.data.workspaceId,
    });
    revalidatePath("/", "layout");
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
