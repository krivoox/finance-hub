import "server-only";
import { prisma } from "@/lib/prisma";
import {
  requireMembership,
  type MembershipContext,
} from "@/features/workspaces/services";
import {
  BudgetNotFoundError,
  type BudgetPeriod,
} from "@/features/budgets/domain";

export type BudgetRecord = {
  id: string;
  workspaceId: string;
  name: string;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date | null;
  limitCents: number;
  currency: string;
  isArchived: boolean;
  categoryIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Loads a budget and verifies the caller's membership in its workspace.
 * Throws `BudgetNotFoundError` for unknown ids (does not leak workspace ids).
 */
export async function requireBudgetMembership(
  userId: string,
  budgetId: string,
): Promise<{ budget: BudgetRecord; membership: MembershipContext }> {
  const row = await prisma.budget.findUnique({
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

  if (!row) throw new BudgetNotFoundError();

  const membership = await requireMembership(userId, row.workspaceId);

  const budget: BudgetRecord = {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    period: row.period as BudgetPeriod,
    startDate: row.startDate,
    endDate: row.endDate,
    limitCents: row.limitCents,
    currency: row.currency,
    isArchived: row.isArchived,
    categoryIds: row.categories.map((c) => c.categoryId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return { budget, membership };
}
