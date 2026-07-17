import { z } from "zod";
import { ACCOUNT_CURRENCIES } from "@/domain/money/currencies";
import { GOAL_KINDS, GOAL_NAME_MAX_LENGTH } from "@/features/goals/domain";

const goalNameSchema = z
  .string()
  .trim()
  .min(1, "Nombre requerido")
  .max(GOAL_NAME_MAX_LENGTH, `Máximo ${GOAL_NAME_MAX_LENGTH} caracteres`);

const positiveIntCents = z
  .number({ message: "Debe ser un número" })
  .int("Debe ser entero")
  .positive("Debe ser mayor a 0");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

const goalKindSchema = z.enum(GOAL_KINDS);

export const createGoalSchema = z.object({
  workspaceId: z.string().min(1),
  name: goalNameSchema,
  kind: goalKindSchema,
  targetAmountCents: positiveIntCents,
  currency: z.enum(ACCOUNT_CURRENCIES).optional(),
  targetDate: isoDateSchema.optional().nullable(),
  linkedAccountId: z.string().min(1).optional().nullable(),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const contributeToGoalSchema = z.object({
  goalId: z.string().min(1),
  amountCents: positiveIntCents,
  contributedOn: isoDateSchema,
  note: z.string().trim().max(240, "Máximo 240 caracteres").optional().nullable(),
});
export type ContributeToGoalInput = z.infer<typeof contributeToGoalSchema>;

export const cancelGoalSchema = z.object({
  goalId: z.string().min(1),
});
export type CancelGoalInput = z.infer<typeof cancelGoalSchema>;

export const completeGoalSchema = z.object({
  goalId: z.string().min(1),
});
export type CompleteGoalInput = z.infer<typeof completeGoalSchema>;

export const listGoalsSchema = z.object({
  workspaceId: z.string().min(1),
  includeCancelled: z.boolean().optional().default(false),
});
export type ListGoalsInput = z.infer<typeof listGoalsSchema>;

export const getGoalSchema = z.object({
  goalId: z.string().min(1),
});
export type GetGoalInput = z.infer<typeof getGoalSchema>;
