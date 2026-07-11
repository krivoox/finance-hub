import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata = {
  title: "Restablecer contraseña · Finance Hub",
};

type SearchParams = { token?: string; error?: string };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { token, error } = await searchParams;

  if (!token || error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-foreground">Enlace inválido</h1>
        <p className="text-xs text-muted-foreground">
          Este enlace expiró o no es válido. Solicitá uno nuevo.
        </p>
        <Link
          href="/forgot-password"
          className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">
          Restablecer contraseña
        </h1>
        <p className="text-xs text-muted-foreground">
          Elegí una nueva contraseña para tu cuenta.
        </p>
      </div>

      <ResetPasswordForm token={token} />
    </div>
  );
}
