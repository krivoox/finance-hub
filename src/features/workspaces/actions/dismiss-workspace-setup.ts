"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  workspaceSetupIdSchema,
  type WorkspaceSetupIdInput,
} from "@/features/workspaces/schemas";
import { dismissWorkspaceSetup as dismissWorkspaceSetupService } from "@/features/workspaces/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function dismissWorkspaceSetupAction(
  input: WorkspaceSetupIdInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = workspaceSetupIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await dismissWorkspaceSetupService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
