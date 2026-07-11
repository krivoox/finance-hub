import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertGroupWorkspace,
  computeMemberBalances,
  type MemberBalance,
} from "@/features/splits/domain";
import { computeTotalBalance } from "@/features/dashboard/domain";
import { listAccounts } from "@/features/accounts/services";
import { listTransactions } from "@/features/transactions/services";
import { requireMembership } from "@/features/workspaces/services";

export async function getMemberBalances(input: {
  userId: string;
  workspaceId: string;
}): Promise<MemberBalance[]> {
  await requireMembership(input.userId, input.workspaceId);

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: input.workspaceId },
    select: { type: true },
  });
  assertGroupWorkspace(workspace.type);

  const [members, splits, settlements] = await Promise.all([
    prisma.membership.findMany({
      where: { workspaceId: input.workspaceId },
      select: { userId: true },
    }),
    prisma.expenseSplit.findMany({
      where: { workspaceId: input.workspaceId },
      select: {
        paidByUserId: true,
        shares: { select: { userId: true, shareCents: true } },
      },
    }),
    prisma.settlement.findMany({
      where: { workspaceId: input.workspaceId },
      select: {
        fromUserId: true,
        toUserId: true,
        amountCents: true,
      },
    }),
  ]);

  return computeMemberBalances(
    splits.map((s) => ({
      paidByUserId: s.paidByUserId,
      shares: s.shares,
    })),
    settlements,
    members.map((m) => m.userId),
  );
}

export async function getGroupOverview(input: {
  userId: string;
  workspaceId: string;
}) {
  await requireMembership(input.userId, input.workspaceId);

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: input.workspaceId },
    select: { type: true, name: true, baseCurrency: true },
  });
  assertGroupWorkspace(workspace.type);

  const [accounts, memberBalances, activity] = await Promise.all([
    listAccounts({
      userId: input.userId,
      workspaceId: input.workspaceId,
    }),
    getMemberBalances(input),
    listTransactions({
      userId: input.userId,
      workspaceId: input.workspaceId,
      limit: 10,
    }),
  ]);

  const members = await prisma.membership.findMany({
    where: { workspaceId: input.workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          displayName: true,
          email: true,
        },
      },
    },
  });

  const nameByUserId = new Map(
    members.map((m) => [
      m.userId,
      m.user.displayName?.trim() || m.user.name || m.user.email,
    ]),
  );

  const totalBalance = computeTotalBalance(accounts, workspace.baseCurrency);

  return {
    workspaceId: input.workspaceId,
    name: workspace.name,
    currency: workspace.baseCurrency,
    totalBalance,
    memberBalances: memberBalances.map((b) => ({
      ...b,
      displayName: nameByUserId.get(b.userId) ?? b.userId,
    })),
    recentActivity: activity.items,
    members: members.map((m) => ({
      userId: m.userId,
      role: m.role,
      displayName: nameByUserId.get(m.userId) ?? m.userId,
    })),
  };
}
