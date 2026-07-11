import "server-only";
import { prisma } from "@/lib/prisma";
import { assertCanMutateBudgets } from "@/features/budgets/domain";
import { requireBudgetMembership } from "./require-budget-membership";

export type ArchiveBudgetServiceInput = {
  userId: string;
  budgetId: string;
};

/**
 * SPEC-07 FR-05 — Soft-archive a budget so it stops appearing in the active
 * list without losing history (archive-over-delete, `docs/architecture.md`).
 */
export async function archiveBudget({
  userId,
  budgetId,
}: ArchiveBudgetServiceInput): Promise<{ id: string; isArchived: true }> {
  const { budget, membership } = await requireBudgetMembership(
    userId,
    budgetId,
  );
  assertCanMutateBudgets(membership.role);

  if (budget.isArchived) return { id: budget.id, isArchived: true };

  await prisma.budget.update({
    where: { id: budgetId },
    data: { isArchived: true },
  });
  return { id: budgetId, isArchived: true };
}

export async function unarchiveBudget({
  userId,
  budgetId,
}: ArchiveBudgetServiceInput): Promise<{ id: string; isArchived: false }> {
  const { budget, membership } = await requireBudgetMembership(
    userId,
    budgetId,
  );
  assertCanMutateBudgets(membership.role);

  if (!budget.isArchived) return { id: budget.id, isArchived: false };

  await prisma.budget.update({
    where: { id: budgetId },
    data: { isArchived: false },
  });
  return { id: budgetId, isArchived: false };
}
