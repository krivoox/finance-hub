import "server-only";
import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  assertCanMutateMembers,
  assertNotRemovingLastOwner,
  type MembershipEntry,
  type MembershipRole,
} from "@/features/workspaces/domain";
import { requireMembership } from "./require-membership";

export type RemoveMemberServiceInput = {
  callerUserId: string;
  workspaceId: string;
  targetUserId: string;
};

/**
 * SPEC-02 FR-07 — Remove a member. The last owner cannot be removed (T-02).
 *
 * A user can also leave the workspace by passing themselves as the target, as
 * long as they're not the last owner.
 */
export async function removeMember({
  callerUserId,
  workspaceId,
  targetUserId,
}: RemoveMemberServiceInput): Promise<void> {
  const { role: callerRole } = await requireMembership(
    callerUserId,
    workspaceId,
  );

  const isSelfLeave = callerUserId === targetUserId;
  if (!isSelfLeave) {
    assertCanMutateMembers(callerRole);
  }

  const rows = await prisma.membership.findMany({
    where: { workspaceId },
    select: { userId: true, role: true },
  });
  const members: MembershipEntry[] = rows.map((r) => ({
    userId: r.userId,
    role: r.role as MembershipRole,
  }));

  // Admin cannot remove an owner (only owners can, e.g. via transfer flow).
  const target = members.find((m) => m.userId === targetUserId);
  if (!target) {
    throw new ForbiddenError("User is not a member of this workspace");
  }
  if (callerRole === "admin" && target.role === "owner") {
    throw new ForbiddenError("Admins cannot remove an owner");
  }

  assertNotRemovingLastOwner(members, targetUserId);

  await prisma.membership.delete({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });
}
