import "server-only";
import { prisma } from "@/lib/prisma";
import { assertCanDismissSetup } from "@/features/workspaces/domain";
import { requireSetupManager } from "./get-workspace-setup-status";
import { addSetupDismissedWorkspace } from "./setup-cookie";

/**
 * SPEC-15 — Dismiss forced onboarding when still at zero accounts (avoid loop).
 */
export async function dismissWorkspaceSetup({
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
  assertCanDismissSetup(accountCount);

  await addSetupDismissedWorkspace(workspaceId);
}
