import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanManageSetup,
  shouldRedirectToOnboarding,
  type MembershipRole,
} from "@/features/workspaces/domain";
import { requireMembership } from "./require-membership";
import { isSetupDismissed } from "./setup-cookie";

export type WorkspaceSetupStatus = {
  needsSetup: boolean;
  accountCount: number;
  transactionCount: number;
  dismissedSetup: boolean;
  role: MembershipRole;
  workspaceId: string;
  workspaceName: string;
  baseCurrency: string;
};

/**
 * SPEC-15 FR-07 — Setup status for the active (or given) workspace.
 */
export async function getWorkspaceSetupStatus({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}): Promise<WorkspaceSetupStatus> {
  const { role } = await requireMembership(userId, workspaceId);

  const [workspace, accountCount, transactionCount, dismissedSetup] =
    await Promise.all([
      prisma.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        select: { id: true, name: true, baseCurrency: true },
      }),
      prisma.financeAccount.count({
        where: { workspaceId, isArchived: false },
      }),
      prisma.transaction.count({
        where: { workspaceId },
      }),
      isSetupDismissed(workspaceId),
    ]);

  // Authz for reading status: any member. needsSetup only for owner/admin.
  const needsSetup = shouldRedirectToOnboarding({
    role,
    accountCount,
    dismissedSetup,
  });

  return {
    needsSetup,
    accountCount,
    transactionCount,
    dismissedSetup,
    role,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    baseCurrency: workspace.baseCurrency,
  };
}

/**
 * Throws if the role cannot manage setup. Used by complete/dismiss/identity.
 */
export async function requireSetupManager(
  userId: string,
  workspaceId: string,
): Promise<{ role: MembershipRole }> {
  const { role } = await requireMembership(userId, workspaceId);
  assertCanManageSetup(role);
  return { role };
}
