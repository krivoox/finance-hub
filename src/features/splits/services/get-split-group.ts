import "server-only";
import { prisma } from "@/lib/prisma";
import {
  canRemoveMember,
  canRenameMember,
  computeMemberBalances,
  memberHasLedgerHistory,
} from "@/features/splits/domain";
import { toMemberRef } from "./member-map";
import { loadSplitGroupForUser } from "./require-split-group-access";

export async function getSplitGroup(input: {
  userId: string;
  splitGroupId: string;
}) {
  const { group, actor } = await loadSplitGroupForUser(
    input.userId,
    input.splitGroupId,
  );

  const [splits, settlements] = await Promise.all([
    prisma.expenseSplit.findMany({
      where: { splitGroupId: group.id },
      include: {
        shares: true,
        expense: {
          select: {
            id: true,
            amountCents: true,
            currency: true,
            occurredOn: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.settlement.findMany({
      where: { splitGroupId: group.id },
      orderBy: { occurredOn: "desc" },
    }),
  ]);

  const members = group.members.map(toMemberRef);
  const nameById = new Map(members.map((m) => [m.memberId, m.displayName]));
  const paidSplitMemberIds = splits.map((s) => s.paidByMemberId);
  const shareMemberIds = splits.flatMap((s) => s.shares.map((sh) => sh.memberId));
  const settlementMemberIds = settlements.flatMap((s) => [
    s.fromMemberId,
    s.toMemberId,
  ]);
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
  const memberAbm = {
    actorUserId: input.userId,
    createdByUserId: group.createdByUserId,
    actorMemberId: actor.memberId,
  };

  return {
    id: group.id,
    name: group.name,
    currency: group.currency,
    publicShareToken: group.publicShareToken,
    createdByUserId: group.createdByUserId,
    isCreator: group.createdByUserId === input.userId,
    actorMemberId: actor.memberId,
    members: members.map((m) => {
      const hasLedgerHistory = memberHasLedgerHistory({
        memberId: m.memberId,
        paidSplitMemberIds,
        shareMemberIds,
        settlementMemberIds,
      });
      return {
        ...m,
        netCents: balances.find((b) => b.memberId === m.memberId)?.netCents ?? 0,
        canRename: canRenameMember({ ...memberAbm, target: m }),
        canRemove: canRemoveMember({
          ...memberAbm,
          target: m,
          hasLedgerHistory,
        }),
      };
    }),
    balances,
    activity: splits.map((s) => ({
      id: s.id,
      transactionId: s.expense.id,
      description: s.expense.description,
      amountCents: s.expense.amountCents,
      currency: s.expense.currency,
      occurredOn: s.expense.occurredOn,
      paidByMemberId: s.paidByMemberId,
      paidByDisplayName: nameById.get(s.paidByMemberId) ?? "Alguien",
      method: s.method,
    })),
    settlements: settlements.map((s) => ({
      id: s.id,
      fromMemberId: s.fromMemberId,
      toMemberId: s.toMemberId,
      fromDisplayName: nameById.get(s.fromMemberId) ?? "Alguien",
      toDisplayName: nameById.get(s.toMemberId) ?? "Alguien",
      amountCents: s.amountCents,
      occurredOn: s.occurredOn,
      note: s.note,
    })),
  };
}
