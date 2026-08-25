import { z } from "zod";
import { ACCOUNT_CURRENCIES } from "@/domain/money/currencies";

const optionalCurrencySchema = z.enum(ACCOUNT_CURRENCIES).optional();
const nameSchema = z.string().min(1).max(80);

export const createSplitGroupSchema = z.object({
  name: nameSchema,
  kind: z.enum(["ongoing", "one_time"]),
});
export type CreateSplitGroupInput = z.infer<typeof createSplitGroupSchema>;

export const renameSplitGroupSchema = z.object({
  splitGroupId: z.string().min(1),
  name: nameSchema,
});

export const addGhostMemberSchema = z.object({
  splitGroupId: z.string().min(1),
  displayName: nameSchema,
});

export const joinSplitGroupSchema = z.object({
  token: z.string().min(1),
});

export const createExpenseWithSplitSchema = z.discriminatedUnion("method", [
  z.object({
    workspaceId: z.string().min(1),
    splitGroupId: z.string().min(1),
    accountId: z.string().min(1),
    categoryId: z.string().min(1),
    amountCents: z.number().int().positive(),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().max(500).optional().nullable(),
    currency: optionalCurrencySchema,
    method: z.literal("equal"),
  }),
  z.object({
    workspaceId: z.string().min(1),
    splitGroupId: z.string().min(1),
    accountId: z.string().min(1),
    categoryId: z.string().min(1),
    amountCents: z.number().int().positive(),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().max(500).optional().nullable(),
    currency: optionalCurrencySchema,
    method: z.literal("exact"),
    exactShares: z
      .array(
        z.object({
          memberId: z.string().min(1),
          cents: z.number().int().min(0),
        }),
      )
      .min(1),
  }),
  z.object({
    workspaceId: z.string().min(1),
    splitGroupId: z.string().min(1),
    accountId: z.string().min(1),
    categoryId: z.string().min(1),
    amountCents: z.number().int().positive(),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().max(500).optional().nullable(),
    currency: optionalCurrencySchema,
    method: z.literal("percentage"),
    percentages: z
      .array(
        z.object({
          memberId: z.string().min(1),
          percent: z.number().int().min(0).max(100),
        }),
      )
      .min(1),
  }),
]);

export type CreateExpenseWithSplitInput = z.infer<
  typeof createExpenseWithSplitSchema
>;

export const createSettlementSchema = z.object({
  splitGroupId: z.string().min(1),
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  amountCents: z.number().int().positive(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).optional(),
});

export const deleteSettlementSchema = z.object({
  settlementId: z.string().min(1),
});
