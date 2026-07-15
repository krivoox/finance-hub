import "server-only";

import { listBudgetsWithStatus } from "@/features/budgets/services";
import { selectBudgetsAtRisk } from "@/features/dashboard/domain";

import type { NavBadges } from "./nav-config";

/**
 * Server-side nav signals. Only includes counts with a real product meaning;
 * zero / absent means no badge in the sidebar.
 */
export async function getNavBadges({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}): Promise<NavBadges> {
  const budgets = await listBudgetsWithStatus({
    userId,
    workspaceId,
  });
  const budgetsAtRisk = selectBudgetsAtRisk(budgets).length;

  return budgetsAtRisk > 0 ? { budgetsAtRisk } : {};
}
