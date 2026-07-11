import "server-only";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@/features/workspaces/domain";
import { requireMembership } from "./require-membership";

export type WorkspaceMember = {
  userId: string;
  role: MembershipRole;
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    displayName: string | null;
    image: string | null;
  };
};

/**
 * SPEC-02 ListMembers — Any member of the workspace can view its roster.
 */
export async function listMembers(
  callerUserId: string,
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  await requireMembership(callerUserId, workspaceId);

  const rows = await prisma.membership.findMany({
    where: { workspaceId },
    orderBy: { joinedAt: "asc" },
    select: {
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          image: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    userId: row.user.id,
    role: row.role as MembershipRole,
    joinedAt: row.joinedAt,
    user: row.user,
  }));
}
