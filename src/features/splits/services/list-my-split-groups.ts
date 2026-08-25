import "server-only";
import { prisma } from "@/lib/prisma";
import { computeMemberBalances } from "@/features/splits/domain";
import { toMemberRef } from "./member-map";

export type ListedSplitGroup = {
  id: string;
  name: string;
  kind: "ongoing" | "one_time";
  currency: string;
  memberCount: number;
  myNetCents: number;
  isCreator: boolean;
};

export async function listMySplitGroups(
  userId: string,
): Promise<ListedSplitGroup[]> {
  const memberships = await prisma.splitGroupMember.findMany({
    where: { kind: "user", userId },
    include: {
      splitGroup: {
        include: {
          members: true,
          splits: { include: { shares: true } },
          settlements: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((row) => {
    const group = row.splitGroup;
    const members = group.members.map(toMemberRef);
    const balances = computeMemberBalances(
      group.splits.map((s) => ({
        paidByMemberId: s.paidByMemberId,
        shares: s.shares.map((sh) => ({
          memberId: sh.memberId,
          shareCents: sh.shareCents,
        })),
      })),
      group.settlements.map((s) => ({
        fromMemberId: s.fromMemberId,
        toMemberId: s.toMemberId,
        amountCents: s.amountCents,
      })),
      members.map((m) => m.memberId),
    );
    const mine = balances.find((b) => b.memberId === row.id);

    return {
      id: group.id,
      name: group.name,
      kind: group.kind,
      currency: group.currency,
      memberCount: group.members.length,
      myNetCents: mine?.netCents ?? 0,
      isCreator: group.createdByUserId === userId,
    };
  });
}
