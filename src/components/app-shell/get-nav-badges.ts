import "server-only";

import { countBudgetsAtRisk } from "@/features/budgets/services";

import type { NavBadges } from "./nav-config";

/**
 * Server-side nav signals. Only includes counts with a real product meaning;
 * zero / absent means no badge in the sidebar.
 *
 * Uses a period-windowed budget snapshot (not the full expense ledger).
 */
export async function getNavBadges({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}): Promise<NavBadges> {
  const budgetsAtRisk = await countBudgetsAtRisk({ userId, workspaceId });
  return budgetsAtRisk > 0 ? { budgetsAtRisk } : {};
}
