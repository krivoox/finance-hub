import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/session";
import { getInvitationByToken } from "@/features/workspaces/services";
import { AcceptInviteButton } from "@/features/workspaces/components/accept-invite-button";
import { RememberInviteToken } from "@/features/workspaces/components/remember-invite-token";

export const metadata = {
  title: "Invitación · Finance Hub",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
  owner: "Owner",
};

type Params = { token: string };

export default async function InvitationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  const preview = await getInvitationByToken(token);

  if (!preview) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-foreground">
          Invitación inválida
        </h1>
        <p className="text-xs text-muted-foreground">
          Este link no existe o está mal formado.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Ir al login</Link>
        </Button>
      </div>
    );
  }

  const session = await getSession();
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
  const inviteEmail = preview.email.toLowerCase();

  if (preview.isExpired || preview.status === "expired") {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-foreground">
          Invitación expirada
        </h1>
        <p className="text-xs text-muted-foreground">
          {preview.workspace.name}. Pedile una nueva invitación al owner.
        </p>
      </div>
    );
  }

  if (preview.status === "accepted" || preview.status === "rejected") {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-foreground">
          Invitación no disponible
        </h1>
        <p className="text-xs text-muted-foreground">
          Esta invitación ya fue{" "}
          {preview.status === "accepted" ? "aceptada" : "rechazada"}.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RememberInviteToken token={token} />
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-foreground">
          Te invitaron a un workspace
        </h1>
        <p className="text-sm text-foreground">
          <span className="font-medium">{preview.workspace.name}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Invitación para {preview.email}
        </p>
        <Badge variant="secondary">
          Rol: {ROLE_LABEL[preview.role] ?? preview.role}
        </Badge>
      </div>

      {!session ? (
        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link
              href={`/registro?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(preview.email)}`}
            >
              Crear cuenta
            </Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link
              href={`/login?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(preview.email)}`}
            >
              Ya tengo cuenta
            </Link>
          </Button>
        </div>
      ) : sessionEmail !== inviteEmail ? (
        <p className="text-xs text-destructive">
          Estás autenticado como {session.user?.email}, pero la invitación es
          para {preview.email}. Cerrá sesión e iniciá con el email correcto.
        </p>
      ) : (
        <AcceptInviteButton token={token} />
      )}
    </div>
  );
}
