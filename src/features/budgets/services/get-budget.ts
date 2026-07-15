import "server-only";
import { prisma } from "@/lib/prisma";
import { assertCanReadBudgets } from "@/features/budgets/domain";
import type { BudgetLike } from "@/features/budgets/domain";
import { computeBudgetProgress } from "@/features/budgets/domain";
import { CONTRIBUTION_CATEGORY_NAMES } from "@/features/categories/domain";
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

  const [rows, contributionCats] = await Promise.all([
    prisma.transaction.findMany({
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
    }),
    prisma.category.findMany({
      where: {
        workspaceId: budget.workspaceId,
        kind: "expense",
        name: CONTRIBUTION_CATEGORY_NAMES.expense,
      },
      select: { id: true },
    }),
  ]);

  const excludeIds = new Set(contributionCats.map((c) => c.id));

  const progress = computeBudgetProgress(
    like,
    rows
      .filter((r) => !r.categoryId || !excludeIds.has(r.categoryId))
      .map((r) => ({
        type: "expense" as const,
        amountCents: r.amountCents,
        occurredOn: r.occurredOn,
        categoryId: r.categoryId,
      })),
    referenceDate,
  );

  return { ...budget, progress };
}
