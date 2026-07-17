import { z } from "zod";
import { ACCOUNT_CURRENCIES } from "@/domain/money/currencies";
import {
  ACCOUNT_NAME_MAX_LENGTH,
  ACCOUNT_TYPES,
} from "@/features/accounts/domain";

const accountNameSchema = z
  .string()
  .trim()
  .min(1, "Nombre requerido")
  .max(ACCOUNT_NAME_MAX_LENGTH, `Máximo ${ACCOUNT_NAME_MAX_LENGTH} caracteres`);

const accountTypeSchema = z.enum(ACCOUNT_TYPES);

const nonNegativeIntCents = z
  .number({ message: "Debe ser un número" })
  .int("Debe ser entero")
  .min(0, "No puede ser negativo");

const positiveIntCents = z
  .number({ message: "Debe ser un número" })
  .int("Debe ser entero")
  .positive("Debe ser mayor a 0");

export const createAccountSchema = z
  .object({
    workspaceId: z.string().min(1),
    name: accountNameSchema,
    type: accountTypeSchema,
    initialBalanceCents: nonNegativeIntCents,
    currency: z.enum(ACCOUNT_CURRENCIES).optional(),
    creditLimitCents: positiveIntCents.optional(),
  })
  .refine(
    (data) => data.type === "credit_card" || data.creditLimitCents === undefined,
    {
      path: ["creditLimitCents"],
      message: "creditLimit solo aplica a tarjetas de crédito",
    },
  );

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
  accountId: z.string().min(1),
  name: accountNameSchema.optional(),
  creditLimitCents: positiveIntCents.nullable().optional(),
});
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const archiveAccountSchema = z.object({
  accountId: z.string().min(1),
});
export type ArchiveAccountInput = z.infer<typeof archiveAccountSchema>;

export const unarchiveAccountSchema = archiveAccountSchema;
export type UnarchiveAccountInput = z.infer<typeof unarchiveAccountSchema>;

export const listAccountsSchema = z.object({
  workspaceId: z.string().min(1),
  includeArchived: z.boolean().optional().default(false),
});
export type ListAccountsInput = z.infer<typeof listAccountsSchema>;
