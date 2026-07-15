import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@/features/workspaces/domain";

export type WorkspaceSummary = {
  id: string;
  name: string;
  type: "personal" | "group";
  baseCurrency: string;
  role: MembershipRole;
  joinedAt: Date;
};

/**
 * SPEC-02 FR-01 — Lists every workspace where `userId` has a membership.
 * Personal workspace first, then group workspaces by name.
 *
 * Cached per RSC request (layout switcher; no cross-request TTL).
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
        type: m.workspace.type as "personal" | "group",
        baseCurrency: m.workspace.baseCurrency,
        role: m.role as MembershipRole,
        joinedAt: m.joinedAt,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "personal" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  },
);
