import "server-only";
import { prisma } from "@/lib/prisma";
import { seedDefaultCategories } from "@/features/categories/services";
import { pickDefaultLedgerWorkspace } from "@/features/workspaces/domain";

export type CreatePersonalWorkspaceInput = {
  userId: string;
  userName: string;
  baseCurrency?: string;
};

/**
 * Creates a `personal` Workspace + `owner` Membership + default categories
 * (SPEC-04 FR-01) for a freshly-registered user.
 *
 * Idempotent: if the user already has any membership (including a leftover
 * group tenant), this is a no-op and returns that ledger.
 * Runs atomically inside a transaction (SPEC-01, FR-07).
 */
export async function createPersonalWorkspaceForUser({
  userId,
  userName,
  baseCurrency = "ARS",
}: CreatePersonalWorkspaceInput): Promise<{ workspaceId: string }> {
  const existing = await prisma.membership.findMany({
    where: { userId },
    select: {
      workspaceId: true,
      joinedAt: true,
      workspace: { select: { type: true } },
    },
  });
  const existingId = pickDefaultLedgerWorkspace(
    existing.map((m) => ({
      workspaceId: m.workspaceId,
      type: m.workspace.type,
      joinedAt: m.joinedAt,
      cookieHit: false,
    })),
  );
  if (existingId) {
    return { workspaceId: existingId };
  }

  const workspaceName = deriveWorkspaceName(userName);

  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({
      data: {
        name: workspaceName,
        type: "personal",
        baseCurrency,
      },
      select: { id: true },
    });

    await tx.membership.create({
      data: {
        workspaceId: created.id,
        userId,
        role: "owner",
      },
    });

    await seedDefaultCategories({ workspaceId: created.id, client: tx });

    return created;
  });

  return { workspaceId: workspace.id };
}

function deriveWorkspaceName(userName: string): string {
  const trimmed = userName.trim();
  if (trimmed.length === 0) return "Personal";
  const firstName = trimmed.split(/\s+/)[0] ?? trimmed;
  return `${firstName} — Personal`;
}
