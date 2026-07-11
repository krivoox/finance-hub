import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanMutateSplits,
  assertGroupWorkspace,
  assertValidSettlement,
  InvalidSettlementError,
} from "@/features/splits/domain";
import { requireMembership } from "@/features/workspaces/services";

export async function createSettlement(input: {
  userId: string;
  workspaceId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  occurredOn: string;
  note?: string;
}) {
  const membership = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateSplits(membership.role);

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: input.workspaceId },
    select: { type: true },
  });
  assertGroupWorkspace(workspace.type);
  assertValidSettlement(input);

  const memberIds = new Set(
    (
      await prisma.membership.findMany({
        where: { workspaceId: input.workspaceId },
        select: { userId: true },
      })
    ).map((m) => m.userId),
  );
  if (!memberIds.has(input.fromUserId) || !memberIds.has(input.toUserId)) {
    throw new InvalidSettlementError("Settlement parties must be workspace members");
  }

  const [y, m, d] = input.occurredOn.split("-").map(Number);
  const occurredOn = new Date(Date.UTC(y!, m! - 1, d!));

  return prisma.settlement.create({
    data: {
      workspaceId: input.workspaceId,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
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
    throw new InvalidSettlementError("Settlement not found");
  }
  const membership = await requireMembership(input.userId, settlement.workspaceId);
  assertCanMutateSplits(membership.role);

  await prisma.settlement.delete({ where: { id: settlement.id } });
  return { id: settlement.id };
}
