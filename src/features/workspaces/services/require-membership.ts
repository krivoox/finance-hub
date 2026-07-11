import "server-only";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@/features/workspaces/domain";
import { ForbiddenError } from "@/features/workspaces/domain";

export type MembershipContext = {
  userId: string;
  workspaceId: string;
  role: MembershipRole;
};

/**
 * Loads the caller's membership in `workspaceId`, or throws `ForbiddenError`
 * when the user is not a member. Used by every workspace-scoped service and
 * Server Action to enforce tenancy (ADR-002).
 */
export async function requireMembership(
  userId: string,
  workspaceId: string,
): Promise<MembershipContext> {
  const membership = await prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  if (!membership) {
    throw new ForbiddenError("You are not a member of this workspace");
  }
  return {
    userId,
    workspaceId,
    role: membership.role as MembershipRole,
  };
}
