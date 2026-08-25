import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Account ids that belong to a workspace. Shared by list + filtered totals
 * (SPEC-14 OR clause). Request-scoped via React.cache so both services in the
 * same RSC render hit the DB once.
 */
export const listLocalAccountIds = cache(
  async (workspaceId: string): Promise<string[]> => {
    const rows = await prisma.financeAccount.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },
);
