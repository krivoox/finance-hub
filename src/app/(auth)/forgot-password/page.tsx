import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { isGoogleOAuthEnabled } from "@/lib/env";

export const metadata = {
  title: "Recuperar contraseña · Finance Hub",
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-extrabold tracking-tight text-foreground">
          Recuperar contraseña
        </h1>
        <p className="text-xs text-muted-foreground">
          Te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

      {isGoogleOAuthEnabled ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Si entrás con Google y nunca creaste una contraseña, no hay nada que
          recuperar: usá{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Continuar con Google
          </Link>{" "}
          en el login.
        </p>
      ) : null}

      <ForgotPasswordForm />

      <p className="text-center text-xs text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
