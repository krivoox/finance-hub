import { z } from "zod";
import {
  BUDGET_NAME_MAX_LENGTH,
  BUDGET_PERIODS,
} from "@/features/budgets/domain";

const workspaceIdSchema = z.string().min(1, "workspaceId requerido");
const budgetIdSchema = z.string().min(1, "budgetId requerido");

const nameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(BUDGET_NAME_MAX_LENGTH, `Máximo ${BUDGET_NAME_MAX_LENGTH} caracteres`);

const periodSchema = z.enum(BUDGET_PERIODS);

const limitCentsSchema = z
  .number({ message: "Debe ser un número" })
  .int("Debe ser entero (en centavos)")
  .positive("Debe ser mayor a 0");

/**
 * ISO date-string (YYYY-MM-DD). Services parse it into a UTC-midnight Date
 * so it round-trips with Prisma's `@db.Date` columns.
 */
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Formato de fecha inválido (YYYY-MM-DD)");

const categoryIdsSchema = z
  .array(z.string().min(1))
  .max(50, "Demasiadas categorías seleccionadas")
  .default([]);

/**
 * Creation payload. `custom` budgets must include an endDate; other periods
 * must not (validated here and re-checked in the domain layer).
 */
export const createBudgetSchema = z
  .object({
    workspaceId: workspaceIdSchema,
    name: nameSchema,
    period: periodSchema,
    startDate: dateSchema,
    endDate: dateSchema.nullish(),
    limitCents: limitCentsSchema,
    currency: z.string().min(1).optional(),
    categoryIds: categoryIdsSchema,
  })
  .refine(
    (data) => data.period !== "custom" || (data.endDate?.length ?? 0) > 0,
    {
      path: ["endDate"],
      message: "Los presupuestos custom requieren una fecha de fin",
    },
  )
  .refine(
    (data) => data.period === "custom" || !data.endDate,
    {
      path: ["endDate"],
      message: "Solo los presupuestos custom aceptan una fecha de fin",
    },
  );
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = z
  .object({
    budgetId: budgetIdSchema,
    name: nameSchema.optional(),
    limitCents: limitCentsSchema.optional(),
    categoryIds: categoryIdsSchema.optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.limitCents !== undefined ||
      data.categoryIds !== undefined,
    { message: "Nada para actualizar" },
  );
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

export const archiveBudgetSchema = z.object({
  budgetId: budgetIdSchema,
});
export type ArchiveBudgetInput = z.infer<typeof archiveBudgetSchema>;

export const unarchiveBudgetSchema = archiveBudgetSchema;
export type UnarchiveBudgetInput = z.infer<typeof unarchiveBudgetSchema>;

export const listBudgetsSchema = z.object({
  workspaceId: workspaceIdSchema,
  includeArchived: z.boolean().optional().default(false),
});
export type ListBudgetsInput = z.infer<typeof listBudgetsSchema>;

export const getBudgetSchema = z.object({
  budgetId: budgetIdSchema,
});
export type GetBudgetInput = z.infer<typeof getBudgetSchema>;
