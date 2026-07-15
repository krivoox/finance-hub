import { z } from "zod";
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_TYPES,
} from "@/features/transactions/domain";

const workspaceIdSchema = z.string().min(1, "workspaceId requerido");
const accountIdSchema = z.string().min(1, "cuenta requerida");
const categoryIdSchema = z.string().min(1, "categoría requerida");
const transactionIdSchema = z.string().min(1, "id requerido");

const amountCentsSchema = z
  .number({ message: "Debe ser un número" })
  .int("Debe ser entero (en centavos)")
  .positive("Debe ser mayor a 0");

const descriptionSchema = z
  .string()
  .trim()
  .max(
    TRANSACTION_DESCRIPTION_MAX_LENGTH,
    `Máximo ${TRANSACTION_DESCRIPTION_MAX_LENGTH} caracteres`,
  )
  .nullish();

/**
 * ISO date-string (YYYY-MM-DD) as sent from the client. We parse it into a
 * Date in the service, treating it as calendar midnight UTC (Prisma @db.Date).
 */
const occurredOnSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Formato de fecha inválido (YYYY-MM-DD)");

export const createIncomeSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: accountIdSchema,
  categoryId: categoryIdSchema,
  amountCents: amountCentsSchema,
  occurredOn: occurredOnSchema,
  description: descriptionSchema,
});
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;

export const createExpenseSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: accountIdSchema,
  categoryId: categoryIdSchema,
  amountCents: amountCentsSchema,
  occurredOn: occurredOnSchema,
  description: descriptionSchema,
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const createTransferSchema = z
  .object({
    workspaceId: workspaceIdSchema,
    accountId: accountIdSchema,
    counterpartyAccountId: accountIdSchema,
    amountCents: amountCentsSchema,
    occurredOn: occurredOnSchema,
    description: descriptionSchema,
  })
  .refine((data) => data.accountId !== data.counterpartyAccountId, {
    path: ["counterpartyAccountId"],
    message: "El destino debe ser una cuenta distinta al origen",
  });
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export const updateTransactionSchema = z.object({
  transactionId: transactionIdSchema,
  amountCents: amountCentsSchema.optional(),
  occurredOn: occurredOnSchema.optional(),
  description: descriptionSchema,
  categoryId: categoryIdSchema.nullable().optional(),
  accountId: accountIdSchema.optional(),
  counterpartyAccountId: accountIdSchema.nullable().optional(),
});
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const deleteTransactionSchema = z.object({
  transactionId: transactionIdSchema,
});
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;

export const listTransactionsSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: accountIdSchema.optional(),
  categoryId: categoryIdSchema.optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  from: occurredOnSchema.optional(),
  to: occurredOnSchema.optional(),
  cursor: transactionIdSchema.optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;

export const createCrossWorkspaceContributionSchema = z.object({
  sourceAccountId: accountIdSchema,
  targetAccountId: accountIdSchema,
  amountCents: amountCentsSchema,
  occurredOn: occurredOnSchema,
  description: descriptionSchema,
});
export type CreateCrossWorkspaceContributionInput = z.infer<
  typeof createCrossWorkspaceContributionSchema
>;
