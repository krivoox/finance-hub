import "server-only";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/features/categories/domain";

/**
 * Minimal transaction client shape required to seed categories. Accepts either
 * the top-level `prisma` client or a `$transaction` callback client so callers
 * can compose the seed inside a larger workspace-creation transaction (SPEC-04
 * FR-01).
 */
export type CategorySeedClient = {
  category: {
    createMany: (args: {
      data: Array<{
        workspaceId: string;
        name: string;
        kind: "income" | "expense";
      }>;
      skipDuplicates?: boolean;
    }) => Promise<{ count: number }>;
  };
};

export type SeedDefaultCategoriesInput = {
  workspaceId: string;
  /**
   * Optional Prisma transaction client. When omitted, the top-level
   * `prisma` client is used and each call runs in its own implicit transaction.
   */
  client?: CategorySeedClient;
};

/**
 * SPEC-04 FR-01 / T-01 — Seed the default income/expense categories for a
 * fresh workspace. Idempotent thanks to `skipDuplicates`, but callers should
 * normally invoke this exactly once at workspace creation time.
 *
 * Returns the number of rows created (useful for tests and logging).
 */
export async function seedDefaultCategories({
  workspaceId,
  client,
}: SeedDefaultCategoriesInput): Promise<{ count: number }> {
  const db = client ?? (prisma as unknown as CategorySeedClient);
  const data = DEFAULT_CATEGORIES.map((c) => ({
    workspaceId,
    name: c.name,
    kind: c.kind,
  }));
  return db.category.createMany({ data, skipDuplicates: true });
}
