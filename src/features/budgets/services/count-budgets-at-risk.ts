import "server-only";
import { cache } from "react";
import { listBudgetsWithStatus } from "./list-budgets-with-status";

async function countBudgetsAtRiskImpl(
  userId: string,
  workspaceId: string,
): Promise<number> {
  const budgets = await listBudgetsWithStatus({ userId, workspaceId });
  let count = 0;
  for (const b of budgets) {
    if (b.isArchived) continue;
    if (b.progress.status === "warning" || b.progress.status === "exceeded") {
      count += 1;
    }
  }
  return count;
}

const countBudgetsAtRiskCached = cache(countBudgetsAtRiskImpl);

/**
 * Nav badge signal: how many non-archived budgets are in warning or exceeded.
 *
 * Reuses the request-scoped budget snapshot (period-windowed expenses) so a
 * page that also lists budgets does not pay twice.
 */
export async function countBudgetsAtRisk({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}): Promise<number> {
  return countBudgetsAtRiskCached(userId, workspaceId);
}
