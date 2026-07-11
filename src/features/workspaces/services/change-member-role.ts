import "server-only";
import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  WorkspaceDomainError,
  assertCanMutateMembers,
  assertNotRemovingLastOwner,
  type MembershipEntry,
  type MembershipRole,
} from "@/features/workspaces/domain";
import { requireMembership } from "./require-membership";

export type ChangeMemberRoleServiceInput = {
  callerUserId: string;
  workspaceId: string;
  targetUserId: string;
  role: MembershipRole;
};

/**
 * SPEC-02 FR-06 — Change a member's role.
 *
 * Rules:
 * - Only owner/admin may change roles.
 * - Admin cannot promote to owner nor demote an owner (that path is reserved
 *   for transferOwnership).
 * - Demoting the last owner is forbidden (last-owner invariant).
 */
export async function changeMemberRole({
  callerUserId,
  workspaceId,
  targetUserId,
  role,
}: ChangeMemberRoleServiceInput): Promise<void> {
  const { role: callerRole } = await requireMembership(
    callerUserId,
    workspaceId,
  );
  assertCanMutateMembers(callerRole);

  const rows = await prisma.membership.findMany({
    where: { workspaceId },
    select: { userId: true, role: true },
  });

  const members: MembershipEntry[] = rows.map((r) => ({
    userId: r.userId,
    role: r.role as MembershipRole,
  }));
  const target = members.find((m) => m.userId === targetUserId);
  if (!target) {
    throw new WorkspaceDomainError("User is not a member of this workspace");
  }

  // Admin cannot touch owners or grant ownership.
  if (callerRole === "admin" && (role === "owner" || target.role === "owner")) {
    throw new ForbiddenError(
      "Only owners can grant/revoke ownership. Use transferOwnership instead.",
    );
  }

  // If demoting an owner, ensure at least one owner remains.
  if (target.role === "owner" && role !== "owner") {
    assertNotRemovingLastOwner(members, targetUserId);
  }

  if (target.role === role) return;

  await prisma.membership.update({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    data: { role },
  });
}
