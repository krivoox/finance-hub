import "server-only";
import { prisma } from "@/lib/prisma";
import { assertCanRename } from "@/features/workspaces/domain";
import { requireMembership } from "./require-membership";

export type RenameWorkspaceServiceInput = {
  userId: string;
  workspaceId: string;
  name: string;
};

/**
 * SPEC-02 FR-03 — Rename a workspace. Only owner/admin may perform it.
 */
export async function renameWorkspace({
  userId,
  workspaceId,
  name,
}: RenameWorkspaceServiceInput): Promise<{ id: string; name: string }> {
  const { role } = await requireMembership(userId, workspaceId);
  assertCanRename(role);

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name },
    select: { id: true, name: true },
  });

  return updated;
}
