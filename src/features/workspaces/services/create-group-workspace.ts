import "server-only";
import { prisma } from "@/lib/prisma";
import { seedDefaultCategories } from "@/features/categories/services";

export type CreateGroupWorkspaceServiceInput = {
  userId: string;
  name: string;
  baseCurrency: string;
};

export type CreateGroupWorkspaceResult = {
  workspaceId: string;
};

/**
 * SPEC-02 FR-02 / T-01 — Creates a `group` Workspace, marks the caller as
 * `owner`, and seeds the default categories (SPEC-04 FR-01). Atomic.
 */
export async function createGroupWorkspace({
  userId,
  name,
  baseCurrency,
}: CreateGroupWorkspaceServiceInput): Promise<CreateGroupWorkspaceResult> {
  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({
      data: {
        name,
        type: "group",
        baseCurrency,
      },
      select: { id: true },
    });

    await tx.membership.create({
      data: {
        workspaceId: created.id,
        userId,
        role: "owner",
      },
    });

    await seedDefaultCategories({ workspaceId: created.id, client: tx });

    return created;
  });

  return { workspaceId: workspace.id };
}
