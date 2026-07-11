import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata = {
  title: "Crear cuenta · Finance Hub",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">
          Creá tu cuenta
        </h1>
        <p className="text-xs text-muted-foreground">
          Vas a crear un workspace personal en el proceso.
        </p>
      </div>

      <RegisterForm />

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
