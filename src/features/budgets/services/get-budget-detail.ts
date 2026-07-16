import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanReadBudgets,
  computeBudgetProgress,
  listMatchingBudgetExpenses,
  type BudgetLike,
} from "@/features/budgets/domain";
import { CONTRIBUTION_CATEGORY_NAMES } from "@/features/categories/domain";
import { requireBudgetMembership } from "./require-budget-membership";
import type { BudgetWithProgress } from "./list-budgets-with-status";

export type BudgetAffectingTransaction = {
  id: string;
  description: string | null;
  amountCents: number;
  occurredOn: Date;
  currency: string;
  categoryId: string | null;
  categoryName: string | null;
  accountName: string;
};

export type BudgetDetail = BudgetWithProgress & {
  categoryNames: string[];
  transactions: BudgetAffectingTransaction[];
};

/**
 * Budget detail for the active period: progress + expenses that count toward
 * spent (same filter as SPEC-07 FR-02), newest first.
 */
export async function getBudgetDetail({
  userId,
  budgetId,
  referenceDate,
}: {
  userId: string;
  budgetId: string;
  referenceDate?: Date;
}): Promise<BudgetDetail> {
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

  const [expenseRows, contributionCats, linkedCategories] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        workspaceId: budget.workspaceId,
        type: "expense",
      },
      select: {
        id: true,
        type: true,
        amountCents: true,
        occurredOn: true,
        currency: true,
        description: true,
        categoryId: true,
        category: { select: { name: true } },
        account: { select: { name: true } },
      },
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({
      where: {
        workspaceId: budget.workspaceId,
        kind: "expense",
        name: CONTRIBUTION_CATEGORY_NAMES.expense,
      },
      select: { id: true },
    }),
    budget.categoryIds.length > 0
      ? prisma.category.findMany({
          where: { id: { in: [...budget.categoryIds] } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const excludeIds = new Set(contributionCats.map((c) => c.id));

  const candidates = expenseRows
    .filter((r) => !r.categoryId || !excludeIds.has(r.categoryId))
    .map((r) => ({
      id: r.id,
      type: "expense" as const,
      amountCents: r.amountCents,
      occurredOn: r.occurredOn,
      currency: r.currency,
      description: r.description,
      categoryId: r.categoryId,
      categoryName: r.category?.name ?? null,
      accountName: r.account.name,
    }));

  const progress = computeBudgetProgress(like, candidates, referenceDate);
  const matching = listMatchingBudgetExpenses(
    like,
    candidates,
    referenceDate,
  );

  const nameById = new Map(linkedCategories.map((c) => [c.id, c.name]));
  const categoryNames =
    budget.categoryIds.length === 0
      ? []
      : budget.categoryIds.map(
          (id) => nameById.get(id) ?? "Categoría desconocida",
        );

  return {
    ...budget,
    progress,
    categoryNames,
    transactions: matching.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amountCents: tx.amountCents,
      occurredOn: tx.occurredOn,
      currency: tx.currency,
      categoryId: tx.categoryId,
      categoryName: tx.categoryName,
      accountName: tx.accountName,
    })),
  };
}
