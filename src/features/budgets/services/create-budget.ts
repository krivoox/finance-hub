import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  assertCanMutateBudgets,
  assertValidBudgetLimit,
  assertValidBudgetName,
  assertValidBudgetPeriodBounds,
  BudgetDomainError,
  BudgetWorkspaceMismatchError,
  normalizeBudgetName,
  type BudgetPeriod,
} from "@/features/budgets/domain";
import type { BudgetRecord } from "./require-budget-membership";
import { parseBudgetDate } from "./utils";

export type CreateBudgetServiceInput = {
  userId: string;
  workspaceId: string;
  name: string;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string | null;
  limitCents: number;
  currency?: string;
  categoryIds?: readonly string[];
};

/**
 * SPEC-07 FR-01 — Create a budget in the caller's workspace. member+ only.
 *
 * Referenced categories must belong to the same workspace and must be of
 * `kind === "expense"`; enforcing this here prevents mislabeling a budget with
 * an income category that would never match any expense (SPEC-07 §4).
 */
export async function createBudget({
  userId,
  workspaceId,
  name,
  period,
  startDate,
  endDate,
  limitCents,
  currency,
  categoryIds = [],
}: CreateBudgetServiceInput): Promise<BudgetRecord> {
  const { role } = await requireMembership(userId, workspaceId);
  assertCanMutateBudgets(role);

  const trimmedName = normalizeBudgetName(name);
  assertValidBudgetName(trimmedName);
  assertValidBudgetLimit(limitCents);

  const startDateD = parseBudgetDate(startDate);
  const endDateD = endDate ? parseBudgetDate(endDate) : null;
  assertValidBudgetPeriodBounds(period, startDateD, endDateD);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { baseCurrency: true },
  });
  if (!workspace) throw new Error("Workspace not found");

  const budgetCurrency = currency ?? workspace.baseCurrency;
  if (budgetCurrency !== workspace.baseCurrency) {
    throw new BudgetDomainError(
      "La moneda del presupuesto debe coincidir con la del workspace",
    );
  }

  const uniqueCategoryIds = Array.from(new Set(categoryIds));
  if (uniqueCategoryIds.length > 0) {
    const rows = await prisma.category.findMany({
      where: { id: { in: uniqueCategoryIds } },
      select: { id: true, workspaceId: true, kind: true },
    });

    if (rows.length !== uniqueCategoryIds.length) {
      throw new BudgetDomainError(
        "Alguna categoría seleccionada no existe",
      );
    }
    for (const cat of rows) {
      if (cat.workspaceId !== workspaceId) {
        throw new BudgetWorkspaceMismatchError();
      }
      if (cat.kind !== "expense") {
        throw new BudgetDomainError(
          "Solo se pueden asociar categorías de tipo `expense` a un presupuesto",
        );
      }
    }
  }

  const created = await prisma.budget.create({
    data: {
      workspaceId,
      name: trimmedName,
      period,
      startDate: startDateD,
      endDate: endDateD,
      limitCents,
      currency: budgetCurrency,
      categories:
        uniqueCategoryIds.length > 0
          ? {
              create: uniqueCategoryIds.map((categoryId) => ({
                category: { connect: { id: categoryId } },
              })),
            }
          : undefined,
    },
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
    id: created.id,
    workspaceId: created.workspaceId,
    name: created.name,
    period: created.period as BudgetPeriod,
    startDate: created.startDate,
    endDate: created.endDate,
    limitCents: created.limitCents,
    currency: created.currency,
    isArchived: created.isArchived,
    categoryIds: created.categories.map((c) => c.categoryId),
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}
