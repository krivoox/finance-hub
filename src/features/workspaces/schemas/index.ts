import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/features/auth/domain/profile";

const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, "Mínimo 2 caracteres")
  .max(60, "Máximo 60 caracteres");

const roleSchema = z.enum(["owner", "admin", "member", "viewer"] as const);

export const createGroupWorkspaceSchema = z.object({
  name: workspaceNameSchema,
  baseCurrency: z.enum(SUPPORTED_CURRENCIES, {
    message: "Moneda no soportada",
  }),
});
export type CreateGroupWorkspaceInput = z.infer<
  typeof createGroupWorkspaceSchema
>;

export const renameWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  name: workspaceNameSchema,
});
export type RenameWorkspaceInput = z.infer<typeof renameWorkspaceSchema>;

export const inviteMemberSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.string().email("Email inválido").transform((v) => v.toLowerCase()),
  role: roleSchema.exclude(["owner"]),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token requerido"),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const changeMemberRoleSchema = z.object({
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
  role: roleSchema,
});
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;

export const removeMemberSchema = z.object({
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
});
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

export const transferOwnershipSchema = z.object({
  workspaceId: z.string().min(1),
  newOwnerUserId: z.string().min(1),
});
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

export const setActiveWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
});
export type SetActiveWorkspaceInput = z.infer<
  typeof setActiveWorkspaceSchema
>;
