import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  assertCanReadGoals,
  progressPercent,
  type GoalKind,
  type GoalStatus,
} from "@/features/goals/domain";

export type GoalWithProgress = {
  id: string;
  workspaceId: string;
  name: string;
  kind: GoalKind;
  targetAmountCents: number;
  currentAmountCents: number;
  currency: string;
  targetDate: Date | null;
  linkedAccountId: string | null;
  linkedAccountName: string | null;
  status: GoalStatus;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * SPEC-08 §5 — `ListGoals` returns active + completed goals by default;
 * cancelled goals are excluded unless `includeCancelled` is true. The order
 * is: active first, then completed, then cancelled (grouped), and within a
 * group by creation date ascending.
 */
export async function listGoals({
  userId,
  workspaceId,
  includeCancelled = false,
}: {
  userId: string;
  workspaceId: string;
  includeCancelled?: boolean;
}): Promise<GoalWithProgress[]> {
  const { role } = await requireMembership(userId, workspaceId);
  assertCanReadGoals(role);

  const rows = await prisma.goal.findMany({
    where: {
      workspaceId,
      ...(includeCancelled ? {} : { status: { not: "cancelled" } }),
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      workspaceId: true,
      name: true,
      kind: true,
      targetAmountCents: true,
      currentAmountCents: true,
      currency: true,
      targetDate: true,
      linkedAccountId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      linkedAccount: { select: { name: true } },
    },
  });

  const statusRank: Record<GoalStatus, number> = {
    active: 0,
    completed: 1,
    cancelled: 2,
  };

  return rows
    .map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      name: r.name,
      kind: r.kind as GoalKind,
      targetAmountCents: r.targetAmountCents,
      currentAmountCents: r.currentAmountCents,
      currency: r.currency,
      targetDate: r.targetDate,
      linkedAccountId: r.linkedAccountId,
      linkedAccountName: r.linkedAccount?.name ?? null,
      status: r.status as GoalStatus,
      progressPercent: progressPercent(r.currentAmountCents, r.targetAmountCents),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
    .sort((a, b) => {
      const rankDiff = statusRank[a.status] - statusRank[b.status];
      if (rankDiff !== 0) return rankDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
}
