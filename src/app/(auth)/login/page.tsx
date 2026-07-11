import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = {
  title: "Iniciar sesión · Finance Hub",
};

type SearchParams = { callbackUrl?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">
          Iniciá sesión
        </h1>
        <p className="text-xs text-muted-foreground">
          Accedé con tu cuenta de Finance Hub.
        </p>
      </div>

      <LoginForm callbackUrl={callbackUrl} />

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
            href="/registro"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
