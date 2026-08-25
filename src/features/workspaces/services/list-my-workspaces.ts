import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  asPersonalWorkspaceType,
  type MembershipRole,
} from "@/features/workspaces/domain";

export type WorkspaceSummary = {
  id: string;
  name: string;
  type: "personal";
  baseCurrency: string;
  role: MembershipRole;
  joinedAt: Date;
};

/**
 * Lists every **personal** workspace where `userId` has a membership.
 * Group-tenant leftovers (pre-KRI-29) are ignored so the app shell does not
 * 500 when Prisma would otherwise decode `WorkspaceType.group`.
 *
 * Cached per RSC request (layout label; no cross-request TTL).
 */
export const listMyWorkspaces = cache(
  async (userId: string): Promise<WorkspaceSummary[]> => {
    const memberships = await prisma.membership.findMany({
      where: { userId, workspace: { type: "personal" } },
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
      .flatMap((m) => {
        const type = asPersonalWorkspaceType(m.workspace.type);
        if (!type) return [];
        return [
          {
            id: m.workspace.id,
            name: m.workspace.name,
            type,
            baseCurrency: m.workspace.baseCurrency,
            role: m.role as MembershipRole,
            joinedAt: m.joinedAt,
          },
        ];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },
);
