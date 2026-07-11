import "server-only";
import { prisma } from "@/lib/prisma";
import {
  CategoryDomainError,
  assertCanWriteCategories,
} from "@/features/categories/domain";
import { requireMembership } from "@/features/workspaces/services";

export type ArchiveCategoryServiceInput = {
  userId: string;
  workspaceId: string;
  categoryId: string;
};

/**
 * SPEC-04 FR-02 — Soft-archive a category. Archived categories can no longer
 * receive new transactions (SPEC-04 §4) but existing history stays intact.
 * member+ only.
 */
export async function archiveCategory({
  userId,
  workspaceId,
  categoryId,
}: ArchiveCategoryServiceInput): Promise<{ id: string; isArchived: true }> {
  const { role } = await requireMembership(userId, workspaceId);
  assertCanWriteCategories(role);

  const current = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, workspaceId: true, isArchived: true },
  });
  if (!current) throw new CategoryDomainError("La categoría no existe");
  if (current.workspaceId !== workspaceId) {
    throw new CategoryDomainError(
      "La categoría pertenece a otro workspace",
    );
  }

  if (current.isArchived) {
    return { id: current.id, isArchived: true };
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { isArchived: true },
  });

  return { id: categoryId, isArchived: true };
}
