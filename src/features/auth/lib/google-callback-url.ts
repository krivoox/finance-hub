/**
 * Post-OAuth destination for Continuar con Google (login / registro).
 * Pure helper — keep free of React / Better Auth imports for TDD.
 */
export function resolveGoogleCallbackURL({
  mode,
  callbackUrl,
}: {
  mode: "login" | "register";
  callbackUrl?: string;
}): string {
  if (mode === "register") {
    return "/onboarding";
  }
  if (callbackUrl?.startsWith("/")) {
    return callbackUrl;
  }
  return "/dashboard";
}
