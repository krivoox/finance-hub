import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata = {
  title: "Recuperar contraseña · Finance Hub",
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">
          Recuperar contraseña
        </h1>
        <p className="text-xs text-muted-foreground">
          Te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

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
