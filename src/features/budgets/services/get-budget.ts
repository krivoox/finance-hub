import "server-only";
import { prisma } from "@/lib/prisma";
import { assertCanReadBudgets } from "@/features/budgets/domain";
import type { BudgetLike } from "@/features/budgets/domain";
import { computeBudgetProgress } from "@/features/budgets/domain";
import { requireBudgetMembership } from "./require-budget-membership";
import type { BudgetWithProgress } from "./list-budgets-with-status";

/**
 * SPEC-07 — GetBudgetProgress: load a single budget and compute its progress
 * for the active period. Any workspace member (including viewer) can read.
 */
export async function getBudget({
  userId,
  budgetId,
  referenceDate,
}: {
  userId: string;
  budgetId: string;
  referenceDate?: Date;
}): Promise<BudgetWithProgress> {
  const { budget, membership } = await requireBudgetMembership(
    userId,
    budgetId,
  );
  assertCanReadBudgets(membership.role);

  const like: BudgetLike = {
    id: budget.id,
    workspaceId: budget.workspaceId,
    name: budget.name,
    period: budget.period,
    startDate: budget.startDate,
    endDate: budget.endDate,
    limitCents: budget.limitCents,
    currency: budget.currency,
    categoryIds: budget.categoryIds,
    isArchived: budget.isArchived,
  };

  // Fetch only expenses in the active period + categories to keep the payload
  // small. We pull all expenses of the workspace since occurredOn range +
  // category filter would require the period bounds first; the query below is
  // narrow enough for MVP volumes.
  const rows = await prisma.transaction.findMany({
    where: {
      workspaceId: budget.workspaceId,
      type: "expense",
    },
    select: {
      type: true,
      amountCents: true,
      occurredOn: true,
      categoryId: true,
    },
  });

  const progress = computeBudgetProgress(
    like,
    rows.map((r) => ({
      type: "expense" as const,
      amountCents: r.amountCents,
      occurredOn: r.occurredOn,
      categoryId: r.categoryId,
    })),
    referenceDate,
  );

  return { ...budget, progress };
}
