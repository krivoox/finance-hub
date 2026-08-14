import "server-only";
import { prisma } from "@/lib/prisma";
import { assertCanMutateContributionTwin } from "@/features/transactions/domain";
import type { MembershipRole } from "@/features/workspaces/domain";

export type ContributionTwinRef = {
  linkId: string;
  twinId: string;
};

/**
 * SPEC-14 / KRI-19 — If `transactionId` is a cross-workspace contribution
 * (or any linked pair), require a current mutating membership on the twin
 * workspace before the caller mutates either ledger.
 *
 * Returns `null` when there is no link. When the twin row is missing, returns
 * the link ids so the caller can clean up without touching another ledger.
 */
export async function requireContributionTwinAuthz(input: {
  userId: string;
  transactionId: string;
  localWorkspaceId: string;
  localRole: MembershipRole;
  kind?: "contribution";
}): Promise<ContributionTwinRef | null> {
  const link = await prisma.crossWorkspaceLink.findFirst({
    where: {
      ...(input.kind ? { kind: input.kind } : {}),
      OR: [
        { sourceTransactionId: input.transactionId },
        { targetTransactionId: input.transactionId },
      ],
    },
    select: {
      id: true,
      sourceTransactionId: true,
      targetTransactionId: true,
    },
  });
  if (!link) return null;

  const twinId =
    link.sourceTransactionId === input.transactionId
      ? link.targetTransactionId
      : link.sourceTransactionId;

  const twin = await prisma.transaction.findUnique({
    where: { id: twinId },
    select: { id: true, workspaceId: true },
  });

  if (twin) {
    const twinMembership = await prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: twin.workspaceId,
          userId: input.userId,
        },
      },
      select: { role: true },
    });
    assertCanMutateContributionTwin({
      localMembership: {
        workspaceId: input.localWorkspaceId,
        role: input.localRole,
      },
      twinMembership: twinMembership
        ? { workspaceId: twin.workspaceId, role: twinMembership.role }
        : null,
    });
  }

  return { linkId: link.id, twinId };
}
