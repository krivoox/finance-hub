import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanRenameMember,
  assertGhostNameAvailable,
  ghostDisplayNameKey,
  normalizeGhostDisplayName,
  SplitMemberNotInGroupError,
} from "@/features/splits/domain";
import { loadSplitGroupForUser } from "./require-split-group-access";
import { toMemberRef } from "./member-map";

export async function renameSplitGroupMember(input: {
  userId: string;
  splitGroupId: string;
  memberId: string;
  displayName: string;
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
  assertCanRenameMember({
    actorUserId: input.userId,
    createdByUserId: group.createdByUserId,
    actorMemberId: actor.memberId,
    target,
  });

  if (target.kind === "ghost") {
    const existingKeys = group.members
      .filter((m) => m.kind === "ghost" && m.id !== target.memberId && m.displayNameKey)
      .map((m) => m.displayNameKey as string);
    const displayName = assertGhostNameAvailable({
      existingGhostKeys: existingKeys,
      rawName: input.displayName,
    });
    return prisma.splitGroupMember.update({
      where: { id: target.memberId },
      data: {
        displayName,
        displayNameKey: ghostDisplayNameKey(displayName),
      },
    });
  }

  const displayName = normalizeGhostDisplayName(input.displayName);
  return prisma.splitGroupMember.update({
    where: { id: target.memberId },
    data: { displayName },
  });
}
