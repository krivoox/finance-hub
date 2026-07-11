import "server-only";
import { prisma } from "@/lib/prisma";
import {
  CategoryDomainError,
  assertCanWriteCategories,
  assertMaxCategoryDepth,
  assertParentKindMatches,
  assertParentSameWorkspace,
  assertUniqueCategoryName,
  validateCreateCategoryInput,
  type CategoryKind,
  type CategoryLike,
} from "@/features/categories/domain";
import { requireMembership } from "@/features/workspaces/services";

export type CreateCategoryServiceInput = {
  userId: string;
  workspaceId: string;
  name: string;
  kind: CategoryKind;
  parentId?: string | null;
};

export type CreateCategoryResult = {
  id: string;
  name: string;
  kind: CategoryKind;
  parentId: string | null;
};

/**
 * SPEC-04 FR-02 — Create a category. member+ only.
 */
export async function createCategory({
  userId,
  workspaceId,
  name,
  kind,
  parentId,
}: CreateCategoryServiceInput): Promise<CreateCategoryResult> {
  const { role } = await requireMembership(userId, workspaceId);
  assertCanWriteCategories(role);

  const validated = validateCreateCategoryInput({ name, kind });

  const parent = parentId
    ? await prisma.category.findUnique({
        where: { id: parentId },
        select: {
          id: true,
          workspaceId: true,
          name: true,
          kind: true,
          parentId: true,
          isArchived: true,
        },
      })
    : null;

  if (parentId && !parent) {
    throw new CategoryDomainError("La categoría padre no existe");
  }

  const parentLike: CategoryLike | null = parent
    ? {
        id: parent.id,
        workspaceId: parent.workspaceId,
        name: parent.name,
        kind: parent.kind as CategoryKind,
        parentId: parent.parentId,
        isArchived: parent.isArchived,
      }
    : null;

  assertParentSameWorkspace(parentLike, workspaceId);
  assertParentKindMatches(parentLike, validated.kind);
  assertMaxCategoryDepth(parentLike);

  const siblings = await prisma.category.findMany({
    where: { workspaceId, kind: validated.kind, isArchived: false },
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
    validated.kind,
  );

  const created = await prisma.category.create({
    data: {
      workspaceId,
      name: validated.name,
      kind: validated.kind,
      parentId: parentId ?? null,
    },
    select: { id: true, name: true, kind: true, parentId: true },
  });

  return {
    id: created.id,
    name: created.name,
    kind: created.kind as CategoryKind,
    parentId: created.parentId,
  };
}
