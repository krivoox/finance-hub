import "server-only";
import { prisma } from "@/lib/prisma";
import { previewEqualSplit } from "@/features/splits/domain";
import { loadSplitGroupForUser } from "./require-split-group-access";
import { toMemberRef } from "./member-map";

export async function previewEqualSplitForGroup(input: {
  userId: string;
  splitGroupId: string;
  totalCents: number;
}) {
  const { group, actor } = await loadSplitGroupForUser(
    input.userId,
    input.splitGroupId,
  );
  const members = group.members.map(toMemberRef);
  return {
    groupName: group.name,
    currency: group.currency,
    members,
    preview: previewEqualSplit({
      totalCents: input.totalCents,
      memberIds: members.map((m) => m.memberId),
      payerMemberId: actor.memberId,
    }),
  };
}

export async function listSplitGroupsForExpenseForm(userId: string) {
  const memberships = await prisma.splitGroupMember.findMany({
    where: { kind: "user", userId },
    include: {
      splitGroup: { include: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((row) => ({
    id: row.splitGroup.id,
    name: row.splitGroup.name,
    kind: row.splitGroup.kind,
    currency: row.splitGroup.currency,
    memberCount: row.splitGroup.members.length,
    members: row.splitGroup.members.map(toMemberRef),
  }));
}
