"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  renameWorkspaceSchema,
  type RenameWorkspaceInput,
} from "@/features/workspaces/schemas";
import { renameWorkspace as renameWorkspaceService } from "@/features/workspaces/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function renameWorkspaceAction(
  input: RenameWorkspaceInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = renameWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await renameWorkspaceService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
