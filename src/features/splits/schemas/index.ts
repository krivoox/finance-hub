import { z } from "zod";

export const attachSplitSchema = z.discriminatedUnion("method", [
  z.object({
    workspaceId: z.string().min(1),
    expenseTransactionId: z.string().min(1),
    paidByUserId: z.string().min(1),
    method: z.literal("equal"),
    participantUserIds: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    workspaceId: z.string().min(1),
    expenseTransactionId: z.string().min(1),
    paidByUserId: z.string().min(1),
    method: z.literal("percentage"),
    percentages: z
      .array(
        z.object({
          userId: z.string().min(1),
          percent: z.number().int().min(0).max(100),
        }),
      )
      .min(1),
  }),
  z.object({
    workspaceId: z.string().min(1),
    expenseTransactionId: z.string().min(1),
    paidByUserId: z.string().min(1),
    method: z.literal("exact"),
    exactShares: z
      .array(
        z.object({
          userId: z.string().min(1),
          cents: z.number().int().min(0),
        }),
      )
      .min(1),
  }),
]);

export const createSettlementSchema = z.object({
  workspaceId: z.string().min(1),
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  amountCents: z.number().int().positive(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).optional(),
});

export const deleteSettlementSchema = z.object({
  settlementId: z.string().min(1),
});
