import "server-only";
import { prisma } from "@/lib/prisma";
import {
  applyTransferOwnership,
  assertCanTransferOwnership,
  type MembershipEntry,
  type MembershipRole,
} from "@/features/workspaces/domain";
import { requireMembership } from "./require-membership";

export type TransferOwnershipServiceInput = {
  callerUserId: string;
  workspaceId: string;
  newOwnerUserId: string;
};

/**
 * SPEC-02 FR-08 / T-03 — Transfer ownership.
 * Rule: previous owner becomes admin, target becomes owner.
 */
export async function transferOwnership({
  callerUserId,
  workspaceId,
  newOwnerUserId,
}: TransferOwnershipServiceInput): Promise<void> {
  const { role: callerRole } = await requireMembership(
    callerUserId,
    workspaceId,
  );
  assertCanTransferOwnership(callerRole);

  const rows = await prisma.membership.findMany({
    where: { workspaceId },
    select: { userId: true, role: true },
  });
  const before: MembershipEntry[] = rows.map((r) => ({
    userId: r.userId,
    role: r.role as MembershipRole,
  }));

  const after = applyTransferOwnership(before, callerUserId, newOwnerUserId);

  const diff = after.filter((next) => {
    const prev = before.find((b) => b.userId === next.userId);
    return prev?.role !== next.role;
  });

  if (diff.length === 0) return;

  await prisma.$transaction(
    diff.map((entry) =>
      prisma.membership.update({
        where: {
          workspaceId_userId: { workspaceId, userId: entry.userId },
        },
        data: { role: entry.role },
      }),
    ),
  );
}
