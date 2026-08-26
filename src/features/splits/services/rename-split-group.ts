import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanRenameSplitGroup,
  normalizeSplitGroupName,
} from "@/features/splits/domain";
import { loadSplitGroupForUser } from "./require-split-group-access";

export async function renameSplitGroup(input: {
  userId: string;
  splitGroupId: string;
  name: string;
}) {
  const name = normalizeSplitGroupName(input.name);
  const { group } = await loadSplitGroupForUser(input.userId, input.splitGroupId);
  assertCanRenameSplitGroup({
    createdByUserId: group.createdByUserId,
    actorUserId: input.userId,
  });

  return prisma.splitGroup.update({
    where: { id: group.id },
    data: { name },
  });
}
