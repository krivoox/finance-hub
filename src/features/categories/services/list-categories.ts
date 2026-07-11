import "server-only";
import { prisma } from "@/lib/prisma";
import type { CategoryKind } from "@/features/categories/domain";
import { requireMembership } from "@/features/workspaces/services";

export type ListCategoriesServiceInput = {
  userId: string;
  workspaceId: string;
  includeArchived?: boolean;
};

export type CategorySummary = {
  id: string;
  name: string;
  kind: CategoryKind;
  parentId: string | null;
  isArchived: boolean;
  createdAt: Date;
};

/**
 * SPEC-04 FR-05 — Flat listing of categories for a workspace. Any member
 * (including viewer) may read. Sorted by kind, then parentId (root first),
 * then case-insensitive name for stable UI order.
 */
export async function listCategories({
  userId,
  workspaceId,
  includeArchived = false,
}: ListCategoriesServiceInput): Promise<CategorySummary[]> {
  await requireMembership(userId, workspaceId);

  const rows = await prisma.category.findMany({
    where: {
      workspaceId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    select: {
      id: true,
      name: true,
      kind: true,
      parentId: true,
      isArchived: true,
      createdAt: true,
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind as CategoryKind,
    parentId: r.parentId,
    isArchived: r.isArchived,
    createdAt: r.createdAt,
  }));
}
