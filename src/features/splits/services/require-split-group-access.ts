import "server-only";
import { prisma } from "@/lib/prisma";
import {
  NotSplitGroupUserMemberError,
  SplitNotFoundError,
  assertActorIsUserMember,
} from "@/features/splits/domain";
import { toMemberRef, type SplitGroupWithMembers } from "./member-map";

export async function loadSplitGroupForUser(
  userId: string,
  splitGroupId: string,
): Promise<{
  group: SplitGroupWithMembers;
  actor: ReturnType<typeof toMemberRef>;
}> {
  const group = await prisma.splitGroup.findUnique({
    where: { id: splitGroupId },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });
  if (!group) {
    throw new SplitNotFoundError();
  }

  const actor = assertActorIsUserMember({
    members: group.members.map(toMemberRef),
    userId,
  });

  return { group, actor };
}

export async function loadSplitGroupByToken(token: string) {
  if (!token) {
    throw new SplitNotFoundError();
  }
  return prisma.splitGroup.findUnique({
    where: { publicShareToken: token },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });
}

export async function isUserMemberOfSplitGroup(
  userId: string,
  splitGroupId: string,
): Promise<boolean> {
  const row = await prisma.splitGroupMember.findFirst({
    where: { splitGroupId, userId, kind: "user" },
    select: { id: true },
  });
  return row != null;
}

export function assertLoadedUserMember(
  group: SplitGroupWithMembers | null,
  userId: string,
) {
  if (!group) throw new NotSplitGroupUserMemberError();
  return assertActorIsUserMember({
    members: group.members.map(toMemberRef),
    userId,
  });
}
