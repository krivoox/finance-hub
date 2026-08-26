"use server";

import { EmailDomainError } from "@/features/email/domain";
import {
  subscribeMarketingSchema,
  type SubscribeMarketingInput,
} from "@/features/email/schemas";
import { subscribeMarketingContact } from "@/features/email/services/runtime";

export type SubscribeMarketingResult =
  { ok: true } | { ok: false; error: string };

/**
 * Public opt-in to product updates (SPEC-21).
 * Always explicit consent — the form submit is the opt-in.
 */
export async function subscribeMarketingAction(
  input: SubscribeMarketingInput,
): Promise<SubscribeMarketingResult> {
  const parsed = subscribeMarketingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Email inválido",
    };
  }

  try {
    const result = await subscribeMarketingContact({
      email: parsed.data.email,
      explicitOptIn: true,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: "No pudimos suscribirte ahora. Intentá de nuevo.",
      };
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof EmailDomainError) {
      return { ok: false, error: err.message };
    }
    return {
      ok: false,
      error: "No pudimos suscribirte ahora. Intentá de nuevo.",
    };
  }
}
