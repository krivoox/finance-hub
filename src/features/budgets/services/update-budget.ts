import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanMutateBudgets,
  assertValidBudgetLimit,
  assertValidBudgetName,
  BudgetDomainError,
  BudgetWorkspaceMismatchError,
  normalizeBudgetName,
  type BudgetPeriod,
} from "@/features/budgets/domain";
import {
  requireBudgetMembership,
  type BudgetRecord,
} from "./require-budget-membership";

export type UpdateBudgetServiceInput = {
  userId: string;
  budgetId: string;
  name?: string;
  limitCents?: number;
  categoryIds?: readonly string[];
};

/**
 * SPEC-07 FR-05 — Update a budget's name, limit and/or category set.
 * Period / anchor changes are out of scope (spec §5 keeps periods stable to
 * avoid retroactively invalidating history).
 */
export async function updateBudget({
  userId,
  budgetId,
  name,
  limitCents,
  categoryIds,
}: UpdateBudgetServiceInput): Promise<BudgetRecord> {
  const { budget, membership } = await requireBudgetMembership(
    userId,
    budgetId,
  );
  assertCanMutateBudgets(membership.role);

  const data: { name?: string; limitCents?: number } = {};

  if (name !== undefined) {
    const trimmed = normalizeBudgetName(name);
    assertValidBudgetName(trimmed);
    data.name = trimmed;
  }

  if (limitCents !== undefined) {
    assertValidBudgetLimit(limitCents);
    data.limitCents = limitCents;
  }

  if (categoryIds !== undefined) {
    const uniqueCategoryIds = Array.from(new Set(categoryIds));

    if (uniqueCategoryIds.length > 0) {
      const rows = await prisma.category.findMany({
        where: { id: { in: uniqueCategoryIds } },
        select: { id: true, workspaceId: true, kind: true },
      });
      if (rows.length !== uniqueCategoryIds.length) {
        throw new BudgetDomainError("Alguna categoría seleccionada no existe");
      }
      for (const cat of rows) {
        if (cat.workspaceId !== budget.workspaceId) {
          throw new BudgetWorkspaceMismatchError();
        }
        if (cat.kind !== "expense") {
          throw new BudgetDomainError(
            "Solo se pueden asociar categorías de tipo `expense` a un presupuesto",
          );
        }
      }
    }

    await prisma.$transaction([
      prisma.budgetCategory.deleteMany({ where: { budgetId } }),
      ...(uniqueCategoryIds.length > 0
        ? [
            prisma.budgetCategory.createMany({
              data: uniqueCategoryIds.map((categoryId) => ({
                budgetId,
                categoryId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  }

  if (Object.keys(data).length > 0) {
    await prisma.budget.update({
      where: { id: budgetId },
      data,
    });
  }

  const refreshed = await prisma.budget.findUniqueOrThrow({
    where: { id: budgetId },
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
  });

  return {
    id: refreshed.id,
    workspaceId: refreshed.workspaceId,
    name: refreshed.name,
    period: refreshed.period as BudgetPeriod,
    startDate: refreshed.startDate,
    endDate: refreshed.endDate,
    limitCents: refreshed.limitCents,
    currency: refreshed.currency,
    isArchived: refreshed.isArchived,
    categoryIds: refreshed.categories.map((c) => c.categoryId),
    createdAt: refreshed.createdAt,
    updatedAt: refreshed.updatedAt,
  };
}
