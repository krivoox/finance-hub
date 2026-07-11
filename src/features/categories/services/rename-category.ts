import "server-only";
import { prisma } from "@/lib/prisma";
import {
  CategoryDomainError,
  assertCanWriteCategories,
  assertUniqueCategoryName,
  validateCreateCategoryInput,
  type CategoryKind,
  type CategoryLike,
} from "@/features/categories/domain";
import { requireMembership } from "@/features/workspaces/services";

export type RenameCategoryServiceInput = {
  userId: string;
  workspaceId: string;
  categoryId: string;
  name: string;
};

/**
 * SPEC-04 FR-02 — Rename a category. kind is immutable (FR-03) so it's not
 * accepted as input. member+ only.
 */
export async function renameCategory({
  userId,
  workspaceId,
  categoryId,
  name,
}: RenameCategoryServiceInput): Promise<{ id: string; name: string }> {
  const { role } = await requireMembership(userId, workspaceId);
  assertCanWriteCategories(role);

  const current = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, workspaceId: true, kind: true },
  });
  if (!current) throw new CategoryDomainError("La categoría no existe");
  if (current.workspaceId !== workspaceId) {
    throw new CategoryDomainError(
      "La categoría pertenece a otro workspace",
    );
  }

  const validated = validateCreateCategoryInput({
    name,
    kind: current.kind as CategoryKind,
  });

  const siblings = await prisma.category.findMany({
    where: {
      workspaceId,
      kind: current.kind,
      isArchived: false,
      NOT: { id: categoryId },
    },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      kind: true,
      parentId: true,
      isArchived: true,
    },
  });

  assertUniqueCategoryName(
    siblings as CategoryLike[],
    validated.name,
    current.kind as CategoryKind,
  );

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: { name: validated.name },
    select: { id: true, name: true },
  });

  return updated;
}
