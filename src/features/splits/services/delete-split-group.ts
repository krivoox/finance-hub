import "server-only";
import { prisma } from "@/lib/prisma";
import { assertCanDeleteSplitGroup, ForbiddenSplitGroupActionError } from "@/features/splits/domain";
import { loadSplitGroupForUser } from "./require-split-group-access";

export async function deleteSplitGroup(input: {
  userId: string;
  splitGroupId: string;
  confirmName: string;
}) {
  const { group } = await loadSplitGroupForUser(input.userId, input.splitGroupId);
  assertCanDeleteSplitGroup({
    createdByUserId: group.createdByUserId,
    actorUserId: input.userId,
  });
  if (input.confirmName.trim() !== group.name) {
    throw new ForbiddenSplitGroupActionError("Confirmation name does not match");
  }

  // FKs from splits/settlements to members are Restrict: delete children first.
  await prisma.$transaction(async (tx) => {
    await tx.settlement.deleteMany({ where: { splitGroupId: group.id } });
    await tx.expenseSplit.deleteMany({ where: { splitGroupId: group.id } });
    await tx.splitGroupMember.deleteMany({ where: { splitGroupId: group.id } });
    await tx.splitGroup.delete({ where: { id: group.id } });
  });

  return { id: group.id };
}
