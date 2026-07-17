"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  updateWorkspaceIdentitySchema,
  type UpdateWorkspaceIdentityInput,
} from "@/features/workspaces/schemas";
import { updateWorkspaceIdentity as updateWorkspaceIdentityService } from "@/features/workspaces/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

export async function updateWorkspaceIdentityAction(
  input: UpdateWorkspaceIdentityInput,
): Promise<ActionResult<{ name: string; baseCurrency: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = updateWorkspaceIdentitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const updated = await updateWorkspaceIdentityService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      baseCurrency: parsed.data.baseCurrency,
    });
    revalidatePath("/", "layout");
    revalidatePath("/onboarding");
    return {
      ok: true,
      data: { name: updated.name, baseCurrency: updated.baseCurrency },
    };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
