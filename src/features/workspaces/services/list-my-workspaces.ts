import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@/features/workspaces/domain";

export type WorkspaceSummary = {
  id: string;
  name: string;
  type: "personal";
  baseCurrency: string;
  role: MembershipRole;
  joinedAt: Date;
};

/**
 * Lists every workspace where `userId` has a membership.
 * After KRI-29 this is the personal tenant only.
 *
 * Cached per RSC request (layout label; no cross-request TTL).
 */
export const listMyWorkspaces = cache(
  async (userId: string): Promise<WorkspaceSummary[]> => {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: {
        role: true,
        joinedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            type: true,
            baseCurrency: true,
          },
        },
      },
    });

    return memberships
      .map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        type: m.workspace.type as "personal",
        baseCurrency: m.workspace.baseCurrency,
        role: m.role as MembershipRole,
        joinedAt: m.joinedAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
);
