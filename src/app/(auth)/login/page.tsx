import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Iniciar sesión · Finance Hub",
};

type SearchParams = {
  callbackUrl?: string;
  invite?: string;
  email?: string;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { callbackUrl, invite, email } = await searchParams;

  const session = await getSession();
  if (session?.user?.id) {
    redirect(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">
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
