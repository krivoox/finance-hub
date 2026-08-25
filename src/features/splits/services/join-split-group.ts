import "server-only";
import { prisma } from "@/lib/prisma";
import {
  InvalidPublicShareTokenError,
  assertUserIdAvailableInGroup,
} from "@/features/splits/domain";
import { memberDisplayName, toMemberRef } from "./member-map";
import { loadSplitGroupByToken } from "./require-split-group-access";

export async function joinSplitGroup(input: {
  userId: string;
  token: string;
}) {
  const group = await loadSplitGroupByToken(input.token);
  if (!group) {
    throw new InvalidPublicShareTokenError();
  }

  const existingUserIds = group.members
    .filter((m) => m.kind === "user" && m.userId)
    .map((m) => m.userId as string);
  assertUserIdAvailableInGroup({
    existingUserIds,
    userId: input.userId,
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { name: true, displayName: true, email: true },
  });

  const member = await prisma.splitGroupMember.create({
    data: {
      splitGroupId: group.id,
      kind: "user",
      userId: input.userId,
      displayName: memberDisplayName(user),
      displayNameKey: null,
    },
  });

  return {
    splitGroupId: group.id,
    member: toMemberRef(member),
  };
}
