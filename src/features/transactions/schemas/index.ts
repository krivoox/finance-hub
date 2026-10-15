import { z } from "zod";
import { ACCOUNT_CURRENCIES } from "@/domain/money/currencies";
import {
  GROUP_MEMBER_NAME_MAX_LENGTH,
  GROUP_SPLIT_MODES,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_FREQUENCIES,
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

/** Optional explicit currency from the create form (SPEC-05 FR-07 / KRI-10). */
const currencySchema = z.enum(ACCOUNT_CURRENCIES).optional();

export const createIncomeSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: accountIdSchema,
  categoryId: categoryIdSchema,
  amountCents: amountCentsSchema,
  occurredOn: occurredOnSchema,
  description: descriptionSchema,
  currency: currencySchema,
});
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;

export const createExpenseSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: accountIdSchema,
  categoryId: categoryIdSchema,
  amountCents: amountCentsSchema,
  occurredOn: occurredOnSchema,
  description: descriptionSchema,
  currency: currencySchema,
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
    currency: currencySchema,
  })
  .refine((data) => data.accountId !== data.counterpartyAccountId, {
    path: ["counterpartyAccountId"],
    message: "El destino debe ser una cuenta distinta al origen",
  });
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

const targetBalanceCentsSchema = z
  .number({ message: "Debe ser un número" })
  .int("Debe ser entero (en centavos)")
  .refine((value) => Number.isSafeInteger(value), "Monto fuera de rango");

export const createBalanceAdjustmentSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: accountIdSchema,
  targetBalanceCents: targetBalanceCentsSchema,
  occurredOn: occurredOnSchema,
  description: descriptionSchema,
  currency: currencySchema,
});
export type CreateBalanceAdjustmentInput = z.infer<
  typeof createBalanceAdjustmentSchema
>;

export const updateBalanceAdjustmentSchema = z.object({
  transactionId: transactionIdSchema,
  targetBalanceCents: targetBalanceCentsSchema,
  occurredOn: occurredOnSchema.optional(),
  description: descriptionSchema,
});
export type UpdateBalanceAdjustmentInput = z.infer<
  typeof updateBalanceAdjustmentSchema
>;

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
  /** UI list type filter (SPEC-05). Not the full Prisma enum — fx only via `all`. */
  type: z.enum(["all", "income", "expense", "transfer"]).optional(),
  from: occurredOnSchema.optional(),
  to: occurredOnSchema.optional(),
  cursor: transactionIdSchema.optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;

// ---------------------------------------------------------------------------
// SPEC-23 — Core transaction screen.
// ---------------------------------------------------------------------------

const groupSplitMemberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nombre requerido")
    .max(
      GROUP_MEMBER_NAME_MAX_LENGTH,
      `Máximo ${GROUP_MEMBER_NAME_MAX_LENGTH} caracteres`,
    ),
  /** Required for `custom` mode; ignored in `equal` mode. */
  amountCents: z
    .number({ message: "Debe ser un número" })
    .int("Debe ser entero (en centavos)")
    .min(0, "No puede ser negativo")
    .optional(),
});

const groupSplitSchema = z.object({
  method: z.enum(GROUP_SPLIT_MODES),
  members: z.array(groupSplitMemberSchema).max(50, "Máximo 50 personas"),
});

export const createCoreLedgerTransactionSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    workspaceId: workspaceIdSchema,
    accountId: accountIdSchema,
    counterpartyAccountId: accountIdSchema.nullish(),
    categoryId: categoryIdSchema.nullish(),
    amountCents: amountCentsSchema,
    occurredOn: occurredOnSchema,
    description: descriptionSchema,
    currency: currencySchema,
    frequency: z.enum(TRANSACTION_FREQUENCIES).default("once"),
    groupSplit: groupSplitSchema.nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "transfer") {
      if (!data.counterpartyAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["counterpartyAccountId"],
          message: "Elegí una cuenta de destino",
        });
      }
      if (data.categoryId) {
        ctx.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: "Las transferencias no llevan categoría",
        });
      }
      if (data.accountId === data.counterpartyAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["counterpartyAccountId"],
          message: "El destino debe ser una cuenta distinta al origen",
        });
      }
      if (data.groupSplit) {
        ctx.addIssue({
          code: "custom",
          path: ["groupSplit"],
          message: "El gasto grupal solo aplica a gastos e ingresos",
        });
      }
      return;
    }

    if (!data.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Elegí una categoría",
      });
    }
    if (data.counterpartyAccountId) {
      ctx.addIssue({
        code: "custom",
        path: ["counterpartyAccountId"],
        message: "Solo las transferencias llevan cuenta de destino",
      });
    }
  });
export type CreateCoreLedgerTransactionInput = z.infer<
  typeof createCoreLedgerTransactionSchema
>;

export const createCoreAdjustmentSchema = z.object({
  type: z.literal("adjustment"),
  workspaceId: workspaceIdSchema,
  accountId: accountIdSchema,
  targetBalanceCents: targetBalanceCentsSchema,
  occurredOn: occurredOnSchema,
  description: descriptionSchema,
  currency: currencySchema,
});
export type CreateCoreAdjustmentInput = z.infer<
  typeof createCoreAdjustmentSchema
>;

export const coreTransactionTypeSchema = z.enum([
  "income",
  "expense",
  "transfer",
  "adjustment",
]);
export type CoreTransactionType = z.infer<typeof coreTransactionTypeSchema>;
