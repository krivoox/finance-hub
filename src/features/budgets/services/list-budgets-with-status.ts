import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  assertCanReadBudgets,
  computeBudgetProgress,
  unionBudgetPeriodBounds,
  type BudgetExpenseCandidate,
  type BudgetLike,
  type BudgetPeriod,
  type BudgetProgress,
} from "@/features/budgets/domain";
import { CONTRIBUTION_CATEGORY_NAMES } from "@/features/categories/domain";
import type { BudgetRecord } from "./require-budget-membership";

export type BudgetWithProgress = BudgetRecord & {
  progress: BudgetProgress;
};

type BudgetRow = {
  id: string;
  workspaceId: string;
  name: string;
  period: string;
  startDate: Date;
  endDate: Date | null;
  limitCents: number;
  currency: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  categories: { categoryId: string }[];
};

type BudgetSnapshot = {
  budgets: BudgetRow[];
  expenses: BudgetExpenseCandidate[];
};

/**
 * Loads budgets + expense candidates once per request.
 * Expenses are limited to the union of active period windows so we do not
 * pull the entire workspace ledger on every nav/page.
 *
 * Primitive args so React.cache can hit when /budgets and dashboard share
 * the snapshot (referenceDate only affects progress math).
 */
const loadBudgetSnapshot = cache(
  async (
    userId: string,
    workspaceId: string,
    includeArchived: boolean,
  ): Promise<BudgetSnapshot> => {
    const { role } = await requireMembership(userId, workspaceId);
    assertCanReadBudgets(role);

    const [budgets, contributionCategories] = await Promise.all([
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
      // SPEC-14 — exclude contribution outflows from consumer budget "all expenses".
      prisma.category.findMany({
        where: {
          workspaceId,
          kind: "expense",
          name: CONTRIBUTION_CATEGORY_NAMES.expense,
        },
        select: { id: true },
      }),
    ]);

    if (budgets.length === 0) {
      return { budgets, expenses: [] };
    }

    const periodWindow = unionBudgetPeriodBounds(
      budgets.map((b) => ({
        period: b.period as BudgetPeriod,
        startDate: b.startDate,
        endDate: b.endDate,
      })),
    );

    const expenseRows = await prisma.transaction.findMany({
      where: {
        workspaceId,
        type: "expense",
        ...(periodWindow
          ? {
              occurredOn: {
                gte: periodWindow.start,
                lte: periodWindow.end,
              },
            }
          : {}),
      },
      select: {
        type: true,
        amountCents: true,
        occurredOn: true,
        categoryId: true,
        currency: true,
      },
    });

    const contributionCategoryIds = new Set(
      contributionCategories.map((c) => c.id),
    );

    const expenses: BudgetExpenseCandidate[] = expenseRows
      .filter((r) => !r.categoryId || !contributionCategoryIds.has(r.categoryId))
      .map((r) => ({
        type: "expense" as const,
        amountCents: r.amountCents,
        occurredOn: r.occurredOn,
        categoryId: r.categoryId,
        currency: r.currency,
      }));

    return { budgets, expenses };
  },
);

/**
 * SPEC-07 — ListBudgetsWithProgress: return every budget in the workspace
 * (optionally including archived ones) with its progress snapshot for the
 * active period.
 *
 * We load workspace expenses once (period-windowed) and reuse the projection
 * for every budget instead of running one aggregation per budget.
 *
 * The DB snapshot is request-scoped via React.cache; progress is computed
 * per call so a different `referenceDate` never serves stale math.
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
  const { budgets, expenses } = await loadBudgetSnapshot(
    userId,
    workspaceId,
    includeArchived,
  );

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
