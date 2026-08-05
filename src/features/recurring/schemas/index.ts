import { z } from "zod";
import {
  RECURRING_DESCRIPTION_MAX_LENGTH,
  RECURRING_FREQUENCIES,
  RECURRING_NAME_MAX_LENGTH,
  RECURRING_RULE_STATUSES,
  RECURRING_RULE_TYPES,
} from "@/features/recurring/domain";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

const positiveIntCents = z
  .number({ message: "Debe ser un número" })
  .int("Debe ser entero")
  .positive("Debe ser mayor a 0");

const nameSchema = z
  .string()
  .trim()
  .min(1, "Nombre requerido")
  .max(RECURRING_NAME_MAX_LENGTH, `Máximo ${RECURRING_NAME_MAX_LENGTH} caracteres`);

const descriptionSchema = z
  .string()
  .trim()
  .max(RECURRING_DESCRIPTION_MAX_LENGTH, `Máximo ${RECURRING_DESCRIPTION_MAX_LENGTH} caracteres`)
  .optional()
  .nullable();

const idSchema = z.string().min(1);

export const createRecurringRuleSchema = z
  .object({
    workspaceId: idSchema,
    name: nameSchema,
    type: z.enum(RECURRING_RULE_TYPES),
    amountCents: positiveIntCents,
    accountId: idSchema,
    counterpartyAccountId: idSchema.optional().nullable(),
    categoryId: idSchema.optional().nullable(),
    description: descriptionSchema,
    frequency: z.enum(RECURRING_FREQUENCIES),
    startDate: isoDateSchema,
    endDate: isoDateSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "transfer") {
      if (!data.counterpartyAccountId) {
        ctx.addIssue({
          code: "custom",
          message: "Elegí la cuenta de destino",
          path: ["counterpartyAccountId"],
        });
      }
      if (data.categoryId) {
        ctx.addIssue({
          code: "custom",
          message: "Las transferencias no llevan categoría",
          path: ["categoryId"],
        });
      }
    } else {
      if (!data.categoryId) {
        ctx.addIssue({
          code: "custom",
          message: "Elegí la categoría",
          path: ["categoryId"],
        });
      }
      if (data.counterpartyAccountId) {
        ctx.addIssue({
          code: "custom",
          message: "Ingresos y gastos no llevan cuenta destino",
          path: ["counterpartyAccountId"],
        });
      }
    }
  });
export type CreateRecurringRuleInput = z.infer<typeof createRecurringRuleSchema>;

export const updateRecurringRuleSchema = z.object({
  ruleId: idSchema,
  name: nameSchema.optional(),
  amountCents: positiveIntCents.optional(),
  accountId: idSchema.optional(),
  counterpartyAccountId: idSchema.optional().nullable(),
  categoryId: idSchema.optional().nullable(),
  description: descriptionSchema,
  frequency: z.enum(RECURRING_FREQUENCIES).optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional().nullable(),
});
export type UpdateRecurringRuleInput = z.infer<typeof updateRecurringRuleSchema>;

export const ruleIdSchema = z.object({ ruleId: idSchema });
export type RuleIdInput = z.infer<typeof ruleIdSchema>;

export const materializeRecurringOccurrenceSchema = z.object({
  ruleId: idSchema,
  scheduledOn: isoDateSchema,
  overrides: z
    .object({
      occurredOn: isoDateSchema.optional(),
      amountCents: positiveIntCents.optional(),
      description: descriptionSchema,
      categoryId: idSchema.optional().nullable(),
    })
    .optional(),
});
export type MaterializeRecurringOccurrenceInput = z.infer<
  typeof materializeRecurringOccurrenceSchema
>;

export const listRecurringRulesSchema = z.object({
  workspaceId: idSchema,
  status: z.enum([...RECURRING_RULE_STATUSES, "all"] as const).optional(),
  type: z.enum(RECURRING_RULE_TYPES).optional(),
});
export type ListRecurringRulesInput = z.infer<
  typeof listRecurringRulesSchema
>;

export const listPendingOccurrencesSchema = z.object({
  workspaceId: idSchema,
  horizonDays: z.number().int().positive().max(365).optional(),
});
export type ListPendingOccurrencesInput = z.infer<
  typeof listPendingOccurrencesSchema
>;

export const getRecurringRuleSchema = z.object({
  ruleId: idSchema,
});
export type GetRecurringRuleInput = z.infer<typeof getRecurringRuleSchema>;
