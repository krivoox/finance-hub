import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Crear cuenta · Finance Hub",
};

type SearchParams = { invite?: string; email?: string };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { invite, email } = await searchParams;

  const session = await getSession();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">
          Creá tu cuenta
        </h1>
        <p className="text-xs text-muted-foreground">
          {invite
            ? "Vas a crear tu workspace personal y unirte al grupo invitado."
            : "Vas a crear un workspace personal en el proceso."}
        </p>
      </div>

      <RegisterForm inviteToken={invite} prefillEmail={email} />

      <p className="text-center text-xs text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link
          href={
            invite
              ? `/login?invite=${encodeURIComponent(invite)}${email ? `&email=${encodeURIComponent(email)}` : ""}`
              : "/login"
          }
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
