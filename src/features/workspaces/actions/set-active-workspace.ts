"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  setActiveWorkspaceSchema,
  type SetActiveWorkspaceInput,
} from "@/features/workspaces/schemas";
import {
  requireMembership,
  setActiveWorkspaceCookie,
} from "@/features/workspaces/services";
import { domainErrorToMessage, type ActionResult } from "./errors";

/**
 * SPEC-02 FR-09 — Persist the active workspace on the session via cookie.
 * Verifies the caller has a membership before setting it.
 */
export async function setActiveWorkspaceAction(
  input: SetActiveWorkspaceInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = setActiveWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await requireMembership(session.user.id, parsed.data.workspaceId);
    await setActiveWorkspaceCookie(parsed.data.workspaceId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: domainErrorToMessage(err) };
  }
}
