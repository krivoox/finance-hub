import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import {
  pickDefaultLedgerWorkspace,
  toProductWorkspaceType,
  type MembershipRole,
} from "@/features/workspaces/domain";
import { createPersonalWorkspaceForUser } from "./create-personal-workspace";

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

const workspaceSelect = {
  id: true,
  name: true,
  type: true,
  baseCurrency: true,
} as const;

type MembershipRow = {
  role: string;
  joinedAt: Date;
  workspace: {
    id: string;
    name: string;
    type: string;
    baseCurrency: string;
  };
};

function toActiveContext(row: MembershipRow): ActiveWorkspaceContext {
  return {
    id: row.workspace.id,
    name: row.workspace.name,
    type: toProductWorkspaceType(row.workspace.type),
    baseCurrency: row.workspace.baseCurrency,
    role: row.role as MembershipRole,
  };
}

async function loadMemberships(userId: string): Promise<MembershipRow[]> {
  return prisma.membership.findMany({
    where: { userId },
    select: {
      role: true,
      joinedAt: true,
      workspace: { select: workspaceSelect },
    },
  });
}

async function ledgerItemCountsByWorkspace(
  workspaceIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (workspaceIds.length === 0) return counts;

  const [accounts, transactions] = await Promise.all([
    prisma.financeAccount.groupBy({
      by: ["workspaceId"],
      where: { workspaceId: { in: workspaceIds } },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ["workspaceId"],
      where: { workspaceId: { in: workspaceIds } },
      _count: { _all: true },
    }),
  ]);

  for (const row of accounts) {
    counts.set(row.workspaceId, (counts.get(row.workspaceId) ?? 0) + row._count._all);
  }
  for (const row of transactions) {
    counts.set(row.workspaceId, (counts.get(row.workspaceId) ?? 0) + row._count._all);
  }
  return counts;
}

/**
 * Resolves the single implicit ledger for a user. There is no tenant switcher.
 *
 * Order: tenant that already has accounts/txs (heaviest ledger; cookie
 * only if it still has data) → empty cookie/personal/leftover → create.
 *
 * Cached per RSC request so layout and page resolve the workspace once.
 */
export const getActiveWorkspaceForUser = cache(
  async (userId: string): Promise<ActiveWorkspaceContext | null> => {
    const cookieStore = await cookies();
    const cookieId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

    let memberships = await loadMemberships(userId);
    const counts = await ledgerItemCountsByWorkspace(
      memberships.map((m) => m.workspace.id),
    );
    let pickedId = pickDefaultLedgerWorkspace(
      memberships.map((m) => ({
        workspaceId: m.workspace.id,
        type: m.workspace.type,
        joinedAt: m.joinedAt,
        cookieHit: Boolean(cookieId) && m.workspace.id === cookieId,
        ledgerItemCount: counts.get(m.workspace.id) ?? 0,
      })),
    );

    if (!pickedId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, preferredCurrency: true },
      });
      const created = await createPersonalWorkspaceForUser({
        userId,
        userName: user?.name || user?.email || "Personal",
        baseCurrency: user?.preferredCurrency ?? "ARS",
      });
      pickedId = created.workspaceId;
      memberships = await loadMemberships(userId);
    }

    const row = memberships.find((m) => m.workspace.id === pickedId);
    if (!row) return null;

    if (row.workspace.type !== "personal") {
      await prisma.workspace.update({
        where: { id: row.workspace.id },
        data: { type: "personal" },
      });
      row.workspace.type = "personal";
    }

    return toActiveContext(row);
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
