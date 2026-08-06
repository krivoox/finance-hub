/**
 * Post-OAuth destination for Continuar con Google (login / registro / invite).
 * Pure helper — keep free of React / Better Auth imports for TDD.
 */
export function resolveGoogleCallbackURL({
  mode,
  inviteToken,
  callbackUrl,
}: {
  mode: "login" | "register";
  inviteToken?: string;
  callbackUrl?: string;
}): string {
  if (inviteToken) {
    return `/invitaciones/${inviteToken}`;
  }
  if (mode === "register") {
    return "/onboarding";
  }
  if (callbackUrl?.startsWith("/")) {
    return callbackUrl;
  }
  return "/dashboard";
}
