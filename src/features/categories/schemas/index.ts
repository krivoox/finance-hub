import { z } from "zod";
import { CATEGORY_NAME_MAX_LENGTH } from "@/features/categories/domain";

const workspaceIdSchema = z.string().min(1, "workspaceId requerido");
const categoryIdSchema = z.string().min(1, "categoryId requerido");

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(CATEGORY_NAME_MAX_LENGTH, `Máximo ${CATEGORY_NAME_MAX_LENGTH} caracteres`);

const categoryKindSchema = z.enum(["income", "expense"] as const, {
  message: "Tipo de categoría inválido",
});

export const createCategorySchema = z.object({
  workspaceId: workspaceIdSchema,
  name: categoryNameSchema,
  kind: categoryKindSchema,
  parentId: z.string().min(1).nullish(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const renameCategorySchema = z.object({
  workspaceId: workspaceIdSchema,
  categoryId: categoryIdSchema,
  name: categoryNameSchema,
});
export type RenameCategoryInput = z.infer<typeof renameCategorySchema>;

export const archiveCategorySchema = z.object({
  workspaceId: workspaceIdSchema,
  categoryId: categoryIdSchema,
});
export type ArchiveCategoryInput = z.infer<typeof archiveCategorySchema>;
