import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import {
  asPersonalWorkspaceType,
  type MembershipRole,
} from "@/features/workspaces/domain";

/**
 * Cookie carrying the currently-active workspace for the session (SPEC-02 FR-09).
 * Readable on the server without hitting the DB.
 */
export const ACTIVE_WORKSPACE_COOKIE = "fh-workspace-id";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type ActiveWorkspaceContext = {
  id: string;
  name: string;
  type: "personal";
  baseCurrency: string;
  role: MembershipRole;
};

function toActiveContext(row: {
  role: string;
  workspace: {
    id: string;
    name: string;
    type: string;
    baseCurrency: string;
  };
}): ActiveWorkspaceContext | null {
  const type = asPersonalWorkspaceType(row.workspace.type);
  if (!type) return null;
  return {
    id: row.workspace.id,
    name: row.workspace.name,
    type,
    baseCurrency: row.workspace.baseCurrency,
    role: row.role as MembershipRole,
  };
}

/**
 * Resolves the active workspace for a user.
 *
 * Order:
 * 1. `fh-workspace-id` cookie, if it still points to a valid **personal** membership.
 * 2. The user's personal workspace (first by join date).
 *
 * Group-tenant leftovers are skipped so a stale cookie or unmigrated preview
 * DB cannot 500 the authenticated shell.
 *
 * Returns `null` if the user has no personal memberships (edge case: brand-new
 * user during registration).
 *
 * Cached per RSC request so layout and page resolve the workspace once.
 */
export const getActiveWorkspaceForUser = cache(
  async (userId: string): Promise<ActiveWorkspaceContext | null> => {
    const cookieStore = await cookies();
    const cookieId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

    const workspaceSelect = {
      id: true,
      name: true,
      type: true,
      baseCurrency: true,
    } as const;

    if (cookieId) {
      const membership = await prisma.membership.findFirst({
        where: {
          workspaceId: cookieId,
          userId,
          workspace: { type: "personal" },
        },
        select: {
          role: true,
          workspace: { select: workspaceSelect },
        },
      });
      const fromCookie = membership ? toActiveContext(membership) : null;
      if (fromCookie) return fromCookie;
    }

    const fallback = await prisma.membership.findFirst({
      where: { userId, workspace: { type: "personal" } },
      orderBy: { joinedAt: "asc" },
      select: {
        role: true,
        workspace: { select: workspaceSelect },
      },
    });

    return fallback ? toActiveContext(fallback) : null;
  },
);

/**
 * Sets the `fh-workspace-id` cookie. Caller must have verified membership.
 */
export async function setActiveWorkspaceCookie(
  workspaceId: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
  });
}
