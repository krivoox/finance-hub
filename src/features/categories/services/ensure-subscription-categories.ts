import "server-only";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_DEFAULT_CATEGORY_NAMES } from "@/features/categories/domain";

/**
 * Ensures subscription-related expense categories exist (Streaming, IA, …).
 * Idempotent for workspaces seeded before these names were added to defaults.
 */
export async function ensureSubscriptionCategories(
  workspaceId: string,
): Promise<{ created: number }> {
  const existing = await prisma.category.findMany({
    where: {
      workspaceId,
      kind: "expense",
      isArchived: false,
      name: { in: [...SUBSCRIPTION_DEFAULT_CATEGORY_NAMES] },
    },
    select: { name: true },
  });
  const have = new Set(existing.map((c) => c.name));
  const missing = SUBSCRIPTION_DEFAULT_CATEGORY_NAMES.filter(
    (name) => !have.has(name),
  );
  if (missing.length === 0) {
    return { created: 0 };
  }

  const result = await prisma.category.createMany({
    data: missing.map((name) => ({
      workspaceId,
      kind: "expense" as const,
      name,
    })),
    skipDuplicates: true,
  });

  return { created: result.count };
}
