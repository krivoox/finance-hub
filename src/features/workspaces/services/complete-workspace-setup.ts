import "server-only";
import { prisma } from "@/lib/prisma";
import { assertReadyToComplete } from "@/features/workspaces/domain";
import { setActiveWorkspaceCookie } from "./active-workspace";
import { requireSetupManager } from "./get-workspace-setup-status";
import { clearSetupDismissedWorkspace } from "./setup-cookie";

/**
 * SPEC-15 — Marks setup complete: requires ≥1 account, sets active workspace,
 * clears dismiss cookie. Idempotent when already ready.
 */
export async function completeWorkspaceSetup({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}): Promise<void> {
  await requireSetupManager(userId, workspaceId);

  const accountCount = await prisma.financeAccount.count({
    where: { workspaceId, isArchived: false },
  });
  assertReadyToComplete(accountCount);

  await setActiveWorkspaceCookie(workspaceId);
  await clearSetupDismissedWorkspace(workspaceId);
}
