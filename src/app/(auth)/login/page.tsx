import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { OAuthErrorToast } from "@/features/auth/components/oauth-error-toast";
import { env, isGoogleOAuthEnabled } from "@/lib/env";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Iniciar sesión · Finance Hub",
  robots: { index: false, follow: true },
};

type SearchParams = {
  callbackUrl?: string;
  invite?: string;
  email?: string;
  error?: string;
};

/** Avoid bouncing auth to PWA/meta assets used as callbackUrl by middleware. */
function safeCallbackUrl(callbackUrl?: string): string | undefined {
  if (!callbackUrl?.startsWith("/") || callbackUrl.startsWith("//")) {
    return undefined;
  }
  if (
    callbackUrl === "/manifest.webmanifest" ||
    callbackUrl.startsWith("/api/")
  ) {
    return undefined;
  }
  return callbackUrl;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { callbackUrl: rawCallbackUrl, invite, email, error } =
    await searchParams;
  const callbackUrl = safeCallbackUrl(rawCallbackUrl);

  const session = await getSession();
  if (session?.user?.id) {
    redirect(callbackUrl ?? "/dashboard");
  }

  return (
    <div className="space-y-6">
      <OAuthErrorToast error={error} />
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-extrabold tracking-tight text-foreground">
          Iniciá sesión
        </h1>
        <p className="text-xs text-muted-foreground">
          {invite
            ? "Después de iniciar sesión te unís al workspace invitado."
            : "Accedé con tu cuenta de Finance Hub."}
        </p>
      </div>

      <LoginForm
        callbackUrl={callbackUrl}
        inviteToken={invite}
        prefillEmail={email}
        googleEnabled={isGoogleOAuthEnabled}
        googleClientId={env.GOOGLE_CLIENT_ID}
      />

      <div className="space-y-2 text-center text-xs text-muted-foreground">
        <p>
          <Link
            href="/forgot-password"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Olvidé mi contraseña
          </Link>
        </p>
        <p>
          ¿No tenés cuenta?{" "}
          <Link
            href={
              invite
                ? `/registro?invite=${encodeURIComponent(invite)}${email ? `&email=${encodeURIComponent(email)}` : ""}`
                : "/registro"
            }
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
