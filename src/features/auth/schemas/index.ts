import { z } from "zod";
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  SUPPORTED_CURRENCIES,
  isValidTimezone,
} from "@/features/auth/domain/profile";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  displayName: z
    .string()
    .min(DISPLAY_NAME_MIN_LENGTH, `Mínimo ${DISPLAY_NAME_MIN_LENGTH} caracteres`)
    .max(DISPLAY_NAME_MAX_LENGTH, `Máximo ${DISPLAY_NAME_MAX_LENGTH} caracteres`),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Zod schema for the UpdateProfile Server Action (SPEC-01 FR-05).
 * Business rules (currency whitelist, IANA timezone) delegate to the domain.
 */
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(DISPLAY_NAME_MIN_LENGTH, `Mínimo ${DISPLAY_NAME_MIN_LENGTH} caracteres`)
    .max(DISPLAY_NAME_MAX_LENGTH, `Máximo ${DISPLAY_NAME_MAX_LENGTH} caracteres`)
    .optional()
    .or(z.literal("")),
  preferredCurrency: z.enum(SUPPORTED_CURRENCIES, {
    message: "Moneda no soportada",
  }),
  timezone: z
    .string()
    .min(1, "Requerido")
    .refine(isValidTimezone, { message: "Timezone IANA inválida" }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Password reset (SPEC-01 FR-06).
 * Wrapped in Zod so client + server share validation.
 */
export const requestPasswordResetSchema = z.object({
  email: z.string().email("Email inválido"),
});

export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  newPassword: z.string().min(8, "Mínimo 8 caracteres"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
