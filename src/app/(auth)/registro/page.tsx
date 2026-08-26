import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/features/auth/components/register-form";
import { env, isGoogleOAuthEnabled } from "@/lib/env";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Crear cuenta · Finance Hub",
  robots: { index: false, follow: true },
};

type SearchParams = { email?: string };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { email } = await searchParams;

  const session = await getSession();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-extrabold tracking-tight text-foreground">
          Creá tu cuenta
        </h1>
        <p className="text-xs text-muted-foreground">
          Vas a crear un workspace personal en el proceso.
        </p>
      </div>

      <RegisterForm
        prefillEmail={email}
        googleEnabled={isGoogleOAuthEnabled}
        googleClientId={env.GOOGLE_CLIENT_ID}
      />

      <p className="text-center text-xs text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
