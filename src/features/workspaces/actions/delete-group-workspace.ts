"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  deleteGroupWorkspaceSchema,
  type DeleteGroupWorkspaceInput,
} from "@/features/workspaces/schemas";
import { deleteGroupWorkspace } from "@/features/workspaces/services";
import {
  domainErrorCode,
  domainErrorToMessage,
  type ActionResult,
} from "./errors";

export type DeleteGroupWorkspaceActionResult = ActionResult<{
  nextActiveWorkspaceId: string | null;
}> & { code?: string };

export async function deleteGroupWorkspaceAction(
  input: DeleteGroupWorkspaceInput,
): Promise<DeleteGroupWorkspaceActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = deleteGroupWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const result = await deleteGroupWorkspace({
      callerUserId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      confirmName: parsed.data.confirmName,
    });
    revalidatePath("/", "layout");
    return { ok: true, data: result };
  } catch (err) {
    const code = domainErrorCode(err) ?? undefined;
    return { ok: false, error: domainErrorToMessage(err), code };
  }
}
