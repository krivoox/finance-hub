"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  createGroupWorkspaceSchema,
  type CreateGroupWorkspaceInput,
} from "@/features/workspaces/schemas";
import {
  createGroupWorkspace as createGroupWorkspaceService,
  setActiveWorkspaceCookie,
} from "@/features/workspaces/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function createGroupWorkspaceAction(
  input: CreateGroupWorkspaceInput,
): Promise<ActionResult<{ workspaceId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createGroupWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const result = await createGroupWorkspaceService({
      userId: session.user.id,
      name: parsed.data.name,
      baseCurrency: parsed.data.baseCurrency,
    });
    await setActiveWorkspaceCookie(result.workspaceId);
    revalidatePath("/", "layout");
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
