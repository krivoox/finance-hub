import "server-only";
import { prisma } from "@/lib/prisma";
import { CONTRIBUTION_CATEGORY_NAMES } from "@/features/categories/domain";

/**
 * Ensures contribution categories exist for a workspace (SPEC-14).
 * Idempotent for workspaces seeded before these names were added to defaults.
 */
export async function ensureContributionCategories(
  workspaceId: string,
): Promise<{ expenseCategoryId: string; incomeCategoryId: string }> {
  const [expense, income] = await Promise.all([
    prisma.category.findFirst({
      where: {
        workspaceId,
        kind: "expense",
        name: CONTRIBUTION_CATEGORY_NAMES.expense,
        isArchived: false,
      },
      select: { id: true },
    }),
    prisma.category.findFirst({
      where: {
        workspaceId,
        kind: "income",
        name: CONTRIBUTION_CATEGORY_NAMES.income,
        isArchived: false,
      },
      select: { id: true },
    }),
  ]);

  const expenseCategoryId =
    expense?.id ??
    (
      await prisma.category.create({
        data: {
          workspaceId,
          kind: "expense",
          name: CONTRIBUTION_CATEGORY_NAMES.expense,
        },
        select: { id: true },
      })
    ).id;

  const incomeCategoryId =
    income?.id ??
    (
      await prisma.category.create({
        data: {
          workspaceId,
          kind: "income",
          name: CONTRIBUTION_CATEGORY_NAMES.income,
        },
        select: { id: true },
      })
    ).id;

  return { expenseCategoryId, incomeCategoryId };
}
