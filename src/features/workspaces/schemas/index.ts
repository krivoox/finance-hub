import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/features/auth/domain/profile";

const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, "Mínimo 2 caracteres")
  .max(60, "Máximo 60 caracteres");

export const renameWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  name: workspaceNameSchema,
});
export type RenameWorkspaceInput = z.infer<typeof renameWorkspaceSchema>;

export const workspaceSetupIdSchema = z.object({
  workspaceId: z.string().min(1),
});
export type WorkspaceSetupIdInput = z.infer<typeof workspaceSetupIdSchema>;

export const updateWorkspaceIdentitySchema = z
  .object({
    workspaceId: z.string().min(1),
    name: workspaceNameSchema.optional(),
    baseCurrency: z
      .enum(SUPPORTED_CURRENCIES, { message: "Moneda no soportada" })
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.baseCurrency !== undefined, {
    message: "Indicá un nombre o una moneda",
  });
export type UpdateWorkspaceIdentityInput = z.infer<
  typeof updateWorkspaceIdentitySchema
>;
