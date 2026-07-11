import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  assertCanReadBudgets,
  computeBudgetProgress,
  type BudgetExpenseCandidate,
  type BudgetLike,
  type BudgetPeriod,
  type BudgetProgress,
} from "@/features/budgets/domain";
import type { BudgetRecord } from "./require-budget-membership";

export type BudgetWithProgress = BudgetRecord & {
  progress: BudgetProgress;
};

/**
 * SPEC-07 — ListBudgetsWithProgress: return every budget in the workspace
 * (optionally including archived ones) with its progress snapshot for the
 * active period.
 *
 * We load workspace expenses once and reuse the projection for every budget
 * instead of running one aggregation per budget.
 */
export async function listBudgetsWithStatus({
  userId,
  workspaceId,
  includeArchived = false,
  referenceDate,
}: {
  userId: string;
  workspaceId: string;
  includeArchived?: boolean;
  referenceDate?: Date;
}): Promise<BudgetWithProgress[]> {
  const { role } = await requireMembership(userId, workspaceId);
  assertCanReadBudgets(role);

  const [budgets, expenseRows] = await Promise.all([
    prisma.budget.findMany({
      where: {
        workspaceId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: [{ isArchived: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        workspaceId: true,
        name: true,
        period: true,
        startDate: true,
        endDate: true,
        limitCents: true,
        currency: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
        categories: { select: { categoryId: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { workspaceId, type: "expense" },
      select: {
        type: true,
        amountCents: true,
        occurredOn: true,
        categoryId: true,
      },
    }),
  ]);

  const expenses: BudgetExpenseCandidate[] = expenseRows.map((r) => ({
    type: "expense" as const,
    amountCents: r.amountCents,
    occurredOn: r.occurredOn,
    categoryId: r.categoryId,
  }));

  return budgets.map((b) => {
    const categoryIds = b.categories.map((c) => c.categoryId);
    const like: BudgetLike = {
      id: b.id,
      workspaceId: b.workspaceId,
      name: b.name,
      period: b.period as BudgetPeriod,
      startDate: b.startDate,
      endDate: b.endDate,
      limitCents: b.limitCents,
      currency: b.currency,
      categoryIds,
      isArchived: b.isArchived,
    };
    return {
      id: b.id,
      workspaceId: b.workspaceId,
      name: b.name,
      period: b.period as BudgetPeriod,
      startDate: b.startDate,
      endDate: b.endDate,
      limitCents: b.limitCents,
      currency: b.currency,
      isArchived: b.isArchived,
      categoryIds,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      progress: computeBudgetProgress(like, expenses, referenceDate),
    };
  });
}
