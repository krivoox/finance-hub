"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  ProfileValidationError,
  validateProfileUpdate,
} from "@/features/auth/domain/profile";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/features/auth/schemas";

export type UpdateProfileErrorField =
  | "displayName"
  | "preferredCurrency"
  | "timezone"
  | "form";

export type UpdateProfileResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      field?: UpdateProfileErrorField;
    };

/**
 * SPEC-01 FR-05 — Update the current user's profile.
 * Auth + Zod + domain validation, then persist via Prisma.
 */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "No autenticado", field: "form" };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const fieldPath =
      typeof first?.path[0] === "string" ? first.path[0] : "form";
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos",
      field: (fieldPath as UpdateProfileErrorField) ?? "form",
    };
  }

  try {
    const normalized = validateProfileUpdate({
      displayName:
        parsed.data.displayName === "" ? undefined : parsed.data.displayName,
      preferredCurrency: parsed.data.preferredCurrency,
      timezone: parsed.data.timezone,
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        displayName: normalized.displayName ?? null,
        preferredCurrency: normalized.preferredCurrency,
        timezone: normalized.timezone,
      },
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof ProfileValidationError) {
      return { ok: false, error: err.message, field: err.field };
    }
    return {
      ok: false,
      error: "No pudimos actualizar tu perfil. Intentá de nuevo.",
      field: "form",
    };
  }
}
