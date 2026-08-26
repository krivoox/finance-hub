import "server-only";
import { prisma } from "@/lib/prisma";
import { assertValidSettlement } from "@/features/splits/domain";
import { loadSplitGroupForUser } from "./require-split-group-access";

export async function createSettlement(input: {
  userId: string;
  splitGroupId: string;
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
  occurredOn: string;
  note?: string;
}) {
  const { group } = await loadSplitGroupForUser(input.userId, input.splitGroupId);
  assertValidSettlement({
    fromMemberId: input.fromMemberId,
    toMemberId: input.toMemberId,
    amountCents: input.amountCents,
    currentMemberIds: group.members.map((m) => m.id),
  });

  const [y, m, d] = input.occurredOn.split("-").map(Number);
  const occurredOn = new Date(Date.UTC(y!, m! - 1, d!));

  return prisma.settlement.create({
    data: {
      splitGroupId: group.id,
      fromMemberId: input.fromMemberId,
      toMemberId: input.toMemberId,
      amountCents: input.amountCents,
      occurredOn,
      note: input.note,
      createdByUserId: input.userId,
    },
  });
}

export async function deleteSettlement(input: {
  userId: string;
  settlementId: string;
}) {
  const settlement = await prisma.settlement.findUnique({
    where: { id: input.settlementId },
  });
  if (!settlement) {
    throw new Error("Settlement not found");
  }
  await loadSplitGroupForUser(input.userId, settlement.splitGroupId);
  await prisma.settlement.delete({ where: { id: settlement.id } });
  return { id: settlement.id };
}
