import "server-only";
import { cache } from "react";

import { summarizeBudgetNavSignal } from "@/features/budgets/domain";
import type { BudgetNavSignal } from "@/features/budgets/domain";

import { listBudgetsWithStatus } from "./list-budgets-with-status";

async function summarizeBudgetsAtRiskImpl(
  userId: string,
  workspaceId: string,
): Promise<BudgetNavSignal> {
  const budgets = await listBudgetsWithStatus({ userId, workspaceId });
  return summarizeBudgetNavSignal(budgets);
}

const summarizeBudgetsAtRiskCached = cache(summarizeBudgetsAtRiskImpl);

/**
 * Nav badge signal: how many non-archived budgets are at risk / exceeded.
 *
 * Reuses the request-scoped budget snapshot (period-windowed expenses) so a
 * page that also lists budgets does not pay twice.
 */
export async function summarizeBudgetsAtRisk({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}): Promise<BudgetNavSignal> {
  return summarizeBudgetsAtRiskCached(userId, workspaceId);
}

/** At-risk total only (warning + exceeded). Prefer `summarizeBudgetsAtRisk` for severity. */
export async function countBudgetsAtRisk({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}): Promise<number> {
  const signal = await summarizeBudgetsAtRisk({ userId, workspaceId });
  return signal.atRisk;
}
