import { redirect } from "next/navigation";
import { ContentPanel } from "@/components/app-shell/content-panel";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
  listMembers,
  listPendingInvitations,
} from "@/features/workspaces/services";
import { GroupsSectionNav } from "@/features/splits/components/groups-section-nav";
import { NewGroupWorkspaceForm } from "@/features/workspaces/components/new-group-workspace-form";
import { InviteMemberForm } from "@/features/workspaces/components/invite-member-form";
import { MembersList } from "@/features/workspaces/components/members-list";
import { PendingInvitationsList } from "@/features/workspaces/components/pending-invitations-list";

export default async function GroupsSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const active = await getActiveWorkspaceForUser(session.user.id);
  if (!active) {
    return (
      <ContentPanel
        title="Grupos"
        description="Administrá miembros e invitaciones."
      >
        <p className="text-sm text-muted-foreground">
          No hay workspace activo.
        </p>
      </ContentPanel>
    );
  }

  if (active.type !== "group") {
    return (
      <ContentPanel
        title="Grupos"
        description="Creá un workspace grupal para invitar miembros."
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            El workspace activo &ldquo;{active.name}&rdquo; es personal. Creá un
            grupo para administrar miembros e invitaciones.
          </p>
          <NewGroupWorkspaceForm />
        </div>
      </ContentPanel>
    );
  }

  const canManageMembers =
    active.role === "owner" || active.role === "admin";

  const [members, pending] = await Promise.all([
    listMembers(session.user.id, active.id),
    canManageMembers
      ? listPendingInvitations(session.user.id, active.id)
      : Promise.resolve([]),
  ]);

  return (
    <ContentPanel
      title="Grupos"
      description="Miembros, roles e invitaciones del workspace grupal."
    >
      <GroupsSectionNav active="settings" />

      <div className="mb-6 space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {active.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          Configuración del grupo y acceso de miembros.
        </p>
      </div>

      <section className="mb-8">
        <h3 className="mb-3 text-sm font-medium text-foreground">Miembros</h3>
        <MembersList members={members} />
      </section>

      {canManageMembers ? (
        <section className="space-y-6">
          <InviteMemberForm workspaceId={active.id} />
          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">
              Invitaciones pendientes
            </h3>
            <PendingInvitationsList
              appBaseUrl={env.BETTER_AUTH_URL}
              invitations={pending.map((p) => ({
                id: p.id,
                email: p.email,
                role: p.role,
                token: p.token,
                expiresOn: p.expiresAt.toISOString().slice(0, 10),
              }))}
            />
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Solo owners y admins pueden invitar o gestionar pendientes.
        </p>
      )}
    </ContentPanel>
  );
}
