"use client";

import { useState } from "react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { isStandaloneDisplay } from "@/lib/pwa-display";
import { rememberInviteTokenAction } from "@/features/workspaces/actions";
import { signInWithGoogleIdTokenAction } from "@/features/auth/actions/sign-in-google-id-token";
import { requestGoogleIdToken } from "@/features/auth/lib/google-id-token";
import { resolveGoogleCallbackURL } from "@/features/auth/lib/google-callback-url";
import { Button } from "@/components/ui/button";

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.18v2.96h5.27c-.23 1.25-1.4 3.66-5.27 3.66-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.8 0 3.01.77 3.7 1.43l2.52-2.43C16.84 3.53 14.96 2.7 12.17 2.7 7.05 2.7 2.9 6.9 2.9 12.07S7.05 21.44 12.17 21.44c5.02 0 8.34-3.53 8.34-8.5 0-.57-.06-1-.16-1.84Z"
      />
    </svg>
  );
}

async function signInWithGoogleRedirect(callbackURL: string) {
  const { error } = await signIn.social({
    provider: "google",
    callbackURL,
  });
  return error;
}

const STANDALONE_GOOGLE_HINT =
  "En la app instalada el login con Google debe quedarse en pantalla (sin abrir Safari). Si no aparece el selector de Google, abrí finance.krivoox.com en el navegador.";

export function GoogleSignInButton({
  mode,
  inviteToken,
  callbackUrl,
  googleClientId,
}: {
  mode: "login" | "register";
  inviteToken?: string;
  callbackUrl?: string;
  /** Public OAuth client id for GIS id_token in installed PWAs. */
  googleClientId?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    setIsLoading(true);

    if (inviteToken) {
      try {
        await rememberInviteTokenAction(inviteToken);
      } catch {
        // Cookie is best-effort; OAuth + acceptPendingInvitationsForEmail
        // still cover first-time Google signup by email match.
      }
    }

    const callbackURL = resolveGoogleCallbackURL({
      mode,
      inviteToken,
      callbackUrl,
    });

    const standalone = isStandaloneDisplay();

    try {
      // Prefer GIS id_token for everyone when configured — avoids leaving the
      // PWA for Safari (where the session cookie is stranded). Only fall back
      // to full-page OAuth redirect outside standalone display.
      if (googleClientId) {
        try {
          const token = await requestGoogleIdToken({
            clientId: googleClientId,
            context: mode === "register" ? "signup" : "signin",
          });
          const result = await signInWithGoogleIdTokenAction(token);
          if (!result.ok) {
            setIsLoading(false);
            toast.error(result.error);
            return;
          }
          window.location.assign(callbackURL);
          return;
        } catch {
          if (standalone) {
            setIsLoading(false);
            toast.error(STANDALONE_GOOGLE_HINT);
            return;
          }
          // Browser tab: classic redirect below.
        }
      } else if (standalone) {
        setIsLoading(false);
        toast.error(STANDALONE_GOOGLE_HINT);
        return;
      }

      const error = await signInWithGoogleRedirect(callbackURL);
      if (error) {
        setIsLoading(false);
        toast.error(
          error.message ??
            "No pudimos continuar con Google. Intentá de nuevo.",
        );
      }
      // On success Better Auth redirects away; keep loading state.
    } catch {
      setIsLoading(false);
      toast.error("No pudimos continuar con Google. Intentá de nuevo.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-full gap-2"
      disabled={isLoading}
      onClick={() => void onClick()}
    >
      <GoogleGlyph className="size-4 text-foreground" />
      {isLoading ? "Conectando…" : "Continuar con Google"}
    </Button>
  );
}

export function AuthMethodDivider() {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label="o">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        o
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
