import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertGhostNameAvailable,
  ghostDisplayNameKey,
} from "@/features/splits/domain";
import { loadSplitGroupForUser } from "./require-split-group-access";

export async function addGhostMember(input: {
  userId: string;
  splitGroupId: string;
  displayName: string;
}) {
  const { group } = await loadSplitGroupForUser(input.userId, input.splitGroupId);
  const existingKeys = group.members
    .filter((m) => m.kind === "ghost" && m.displayNameKey)
    .map((m) => m.displayNameKey as string);
  const displayName = assertGhostNameAvailable({
    existingGhostKeys: existingKeys,
    rawName: input.displayName,
  });

  return prisma.splitGroupMember.create({
    data: {
      splitGroupId: group.id,
      kind: "ghost",
      userId: null,
      displayName,
      displayNameKey: ghostDisplayNameKey(displayName),
    },
  });
}
