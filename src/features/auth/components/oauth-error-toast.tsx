"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  state_mismatch:
    "El inicio con Google expiró o se interrumpió (común en la app instalada). Probá de nuevo; si falla, abrí Finance Hub en el navegador.",
  state_security_mismatch:
    "No pudimos validar el inicio con Google en este contexto. Probá de nuevo o abrí la app en el navegador.",
  account_not_linked:
    "Ese Google no se pudo vincular a tu cuenta. Iniciá con email/contraseña o usá el mismo Gmail.",
  access_denied: "Cancelaste el acceso con Google.",
  unable_to_link_account:
    "No pudimos vincular Google a tu cuenta. Intentá de nuevo.",
};

/**
 * Surfaces Better Auth OAuth `?error=` codes as a toast (once per mount).
 */
export function OAuthErrorToast({ error }: { error?: string }) {
  useEffect(() => {
    if (!error) return;
    const message =
      OAUTH_ERROR_MESSAGES[error] ??
      "No pudimos completar el acceso con Google. Intentá de nuevo.";
    toast.error(message);
  }, [error]);

  return null;
}
