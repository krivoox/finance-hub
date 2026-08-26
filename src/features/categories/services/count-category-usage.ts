import "server-only";

import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";

export type CountCategoryUsageInput = {
  userId: string;
  workspaceId: string;
};

/**
 * SPEC-04 FR-07 — Transaction counts per category in the workspace.
 * Categories with zero txs are omitted (callers treat missing as 0).
 */
export async function countCategoryUsage({
  userId,
  workspaceId,
}: CountCategoryUsageInput): Promise<Record<string, number>> {
  await requireMembership(userId, workspaceId);

  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      workspaceId,
      categoryId: { not: null },
    },
    _count: { _all: true },
  });

  const usage: Record<string, number> = {};
  for (const row of rows) {
    if (!row.categoryId) continue;
    usage[row.categoryId] = row._count._all;
  }
  return usage;
}
