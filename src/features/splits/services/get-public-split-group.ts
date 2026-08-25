import "server-only";
import { prisma } from "@/lib/prisma";
import {
  InvalidPublicShareTokenError,
  assertPublicShareToken,
  computeMemberBalances,
  projectPublicSplitGroup,
} from "@/features/splits/domain";
import { toMemberRef } from "./member-map";
import { loadSplitGroupByToken } from "./require-split-group-access";

export async function getPublicSplitGroup(token: string) {
  assertPublicShareToken(token, token);
  const group = await loadSplitGroupByToken(token);
  if (!group) {
    throw new InvalidPublicShareTokenError();
  }

  const [splits, settlements] = await Promise.all([
    prisma.expenseSplit.findMany({
      where: { splitGroupId: group.id },
      include: {
        shares: true,
        expense: {
          select: {
            amountCents: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.settlement.findMany({
      where: { splitGroupId: group.id },
    }),
  ]);

  const members = group.members.map(toMemberRef);
  const balances = computeMemberBalances(
    splits.map((s) => ({
      paidByMemberId: s.paidByMemberId,
      shares: s.shares.map((sh) => ({
        memberId: sh.memberId,
        shareCents: sh.shareCents,
      })),
    })),
    settlements.map((s) => ({
      fromMemberId: s.fromMemberId,
      toMemberId: s.toMemberId,
      amountCents: s.amountCents,
    })),
    members.map((m) => m.memberId),
  );

  return {
    id: group.id,
    kind: group.kind,
    currency: group.currency,
    token: group.publicShareToken,
    ...projectPublicSplitGroup({
      name: group.name,
      members,
      balances,
      activity: splits.map((s) => ({
        description: s.expense.description,
        amountCents: s.expense.amountCents,
        paidByMemberId: s.paidByMemberId,
      })),
    }),
  };
}
