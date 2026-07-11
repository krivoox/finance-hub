import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import type { MembershipRole } from "@/features/workspaces/domain";

/**
 * Cookie carrying the currently-active workspace for the session (SPEC-02 FR-09).
 * Readable on the server without hitting the DB.
 */
export const ACTIVE_WORKSPACE_COOKIE = "fh-workspace-id";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type ActiveWorkspaceContext = {
  id: string;
  name: string;
  type: "personal" | "group";
  baseCurrency: string;
  role: MembershipRole;
};

/**
 * Resolves the active workspace for a user.
 *
 * Order:
 * 1. `fh-workspace-id` cookie, if it still points to a valid membership.
 * 2. The user's personal workspace.
 * 3. First membership by name.
 *
 * Returns `null` if the user has no memberships (edge case: brand-new user
 * during registration).
 */
export async function getActiveWorkspaceForUser(
  userId: string,
): Promise<ActiveWorkspaceContext | null> {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (cookieId) {
    const membership = await prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId: cookieId, userId } },
      select: {
        role: true,
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
    if (membership) {
      return {
        id: membership.workspace.id,
        name: membership.workspace.name,
        type: membership.workspace.type as "personal" | "group",
        baseCurrency: membership.workspace.baseCurrency,
        role: membership.role as MembershipRole,
      };
    }
  }

  const fallback = await prisma.membership.findFirst({
    where: { userId },
    orderBy: [{ workspace: { type: "asc" } }, { joinedAt: "asc" }],
    select: {
      role: true,
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

  if (!fallback) return null;

  return {
    id: fallback.workspace.id,
    name: fallback.workspace.name,
    type: fallback.workspace.type as "personal" | "group",
    baseCurrency: fallback.workspace.baseCurrency,
    role: fallback.role as MembershipRole,
  };
}

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
