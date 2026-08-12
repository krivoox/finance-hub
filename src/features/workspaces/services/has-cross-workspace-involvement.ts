import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * SPEC-02 §5.4 — Signals A/B/C that block hard-delete of a group workspace.
 *
 * A. CrossWorkspaceLink whose source or target tx belongs to this workspace
 * B. Local tx whose account lives in another workspace
 * C. Foreign tx whose accountId points at an account of this workspace
 */
export async function hasCrossWorkspaceInvolvement(
  workspaceId: string,
): Promise<boolean> {
  const [signalA, signalB, signalC] = await Promise.all([
    prisma.crossWorkspaceLink.findFirst({
      where: {
        OR: [
          { sourceTransaction: { workspaceId } },
          { targetTransaction: { workspaceId } },
        ],
      },
      select: { id: true },
    }),
    prisma.transaction.findFirst({
      where: {
        workspaceId,
        account: { workspaceId: { not: workspaceId } },
      },
      select: { id: true },
    }),
    prisma.transaction.findFirst({
      where: {
        workspaceId: { not: workspaceId },
        account: { workspaceId },
      },
      select: { id: true },
    }),
  ]);

  return Boolean(signalA || signalB || signalC);
}
