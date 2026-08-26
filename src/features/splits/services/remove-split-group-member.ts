import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanRemoveMember,
  SplitMemberNotInGroupError,
} from "@/features/splits/domain";
import { loadSplitGroupForUser } from "./require-split-group-access";
import { toMemberRef } from "./member-map";

export async function removeSplitGroupMember(input: {
  userId: string;
  splitGroupId: string;
  memberId: string;
}) {
  const { group, actor } = await loadSplitGroupForUser(
    input.userId,
    input.splitGroupId,
  );
  const targetRow = group.members.find((m) => m.id === input.memberId);
  if (!targetRow) {
    throw new SplitMemberNotInGroupError();
  }
  const target = toMemberRef(targetRow);

  const [paidCount, shareCount, fromCount, toCount] = await Promise.all([
    prisma.expenseSplit.count({ where: { paidByMemberId: target.memberId } }),
    prisma.expenseSplitShare.count({ where: { memberId: target.memberId } }),
    prisma.settlement.count({ where: { fromMemberId: target.memberId } }),
    prisma.settlement.count({ where: { toMemberId: target.memberId } }),
  ]);
  const hasLedgerHistory = paidCount + shareCount + fromCount + toCount > 0;

  assertCanRemoveMember({
    actorUserId: input.userId,
    createdByUserId: group.createdByUserId,
    actorMemberId: actor.memberId,
    target,
    hasLedgerHistory,
  });

  await prisma.splitGroupMember.delete({ where: { id: target.memberId } });
  return { id: target.memberId, splitGroupId: group.id };
}
