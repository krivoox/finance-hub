import "server-only";
import { prisma } from "@/lib/prisma";
import {
  allocateEqual,
  allocateExact,
  allocatePercentage,
  assertCanMutateSplits,
  assertGroupWorkspace,
  InvalidSplitInputError,
  type SplitShare,
} from "@/features/splits/domain";
import { requireMembership } from "@/features/workspaces/services";

type AttachEqual = {
  method: "equal";
  participantUserIds: string[];
};
type AttachPercentage = {
  method: "percentage";
  percentages: { userId: string; percent: number }[];
};
type AttachExact = {
  method: "exact";
  exactShares: { userId: string; cents: number }[];
};

export type AttachSplitInput = {
  userId: string;
  workspaceId: string;
  expenseTransactionId: string;
  paidByUserId: string;
} & (AttachEqual | AttachPercentage | AttachExact);

export async function attachSplitToExpense(input: AttachSplitInput) {
  const membership = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateSplits(membership.role);

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: input.workspaceId },
    select: { type: true },
  });
  assertGroupWorkspace(workspace.type);

  const expense = await prisma.transaction.findFirst({
    where: {
      id: input.expenseTransactionId,
      workspaceId: input.workspaceId,
      type: "expense",
    },
    include: { expenseSplit: true },
  });
  if (!expense) {
    throw new InvalidSplitInputError("Expense transaction not found in workspace");
  }
  if (expense.expenseSplit) {
    throw new InvalidSplitInputError("Expense already has a split");
  }

  const memberIds = new Set(
    (
      await prisma.membership.findMany({
        where: { workspaceId: input.workspaceId },
        select: { userId: true },
      })
    ).map((m) => m.userId),
  );

  if (!memberIds.has(input.paidByUserId)) {
    throw new InvalidSplitInputError("Payer must be a workspace member");
  }

  const shares = resolveShares(input, expense.amountCents);
  for (const share of shares) {
    if (!memberIds.has(share.userId)) {
      throw new InvalidSplitInputError("All share participants must be members");
    }
  }

  return prisma.expenseSplit.create({
    data: {
      workspaceId: input.workspaceId,
      expenseTransactionId: expense.id,
      paidByUserId: input.paidByUserId,
      method: input.method,
      shares: {
        create: shares.map((s) => ({
          userId: s.userId,
          shareCents: s.shareCents,
        })),
      },
    },
    include: { shares: true },
  });
}

function resolveShares(
  input: AttachSplitInput,
  totalCents: number,
): SplitShare[] {
  if (input.method === "equal") {
    return allocateEqual(totalCents, input.participantUserIds);
  }
  if (input.method === "percentage") {
    return allocatePercentage(totalCents, input.percentages);
  }
  return allocateExact(totalCents, input.exactShares);
}
