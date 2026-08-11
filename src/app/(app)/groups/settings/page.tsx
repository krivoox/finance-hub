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
import { MembersManagement } from "@/features/workspaces/components/members-management";
import { PendingInvitationsList } from "@/features/workspaces/components/pending-invitations-list";
import { RenameWorkspaceForm } from "@/features/workspaces/components/rename-workspace-form";
import { LeaveGroupButton } from "@/features/workspaces/components/leave-group-button";
import { DeleteGroupDialog } from "@/features/workspaces/components/delete-group-dialog";

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
            grupo para administrar miembros e invitaciones. El workspace personal
            no se puede eliminar ni abandonar.
          </p>
          <NewGroupWorkspaceForm />
        </div>
      </ContentPanel>
    );
  }

  const canManageMembers =
    active.role === "owner" || active.role === "admin";
  const canRename = canManageMembers;
  const canDelete = active.role === "owner";

  const [members, pending] = await Promise.all([
    listMembers(session.user.id, active.id),
    canManageMembers
      ? listPendingInvitations(session.user.id, active.id)
      : Promise.resolve([]),
  ]);

  const ownerCount = members.filter((m) => m.role === "owner").length;
  const isLastOwner = active.role === "owner" && ownerCount <= 1;
  const canLeave = !isLastOwner;

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

      <section className="mb-8 space-y-3">
        <h3 className="text-sm font-medium text-foreground">Nombre</h3>
        <RenameWorkspaceForm
          workspaceId={active.id}
          initialName={active.name}
          canRename={canRename}
        />
      </section>

      <section className="mb-8">
        <h3 className="mb-3 text-sm font-medium text-foreground">Miembros</h3>
        <MembersManagement
          workspaceId={active.id}
          members={members}
          currentUserId={session.user.id}
          currentRole={active.role}
        />
      </section>

      {canManageMembers ? (
        <section className="mb-8 space-y-6">
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
        <p className="mb-8 text-sm text-muted-foreground">
          Solo owners y admins pueden invitar o gestionar pendientes.
        </p>
      )}

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Zona de peligro</h3>
        <LeaveGroupButton
          workspaceId={active.id}
          workspaceName={active.name}
          canLeave={canLeave}
          blockedReason={
            isLastOwner
              ? "Sos el único owner. Transferí la propiedad a otro miembro antes de salir."
              : undefined
          }
        />
        <DeleteGroupDialog
          workspaceId={active.id}
          workspaceName={active.name}
          canDelete={canDelete}
        />
        {!canDelete ? (
          <p className="text-xs text-muted-foreground">
            Solo el owner puede eliminar el grupo.
          </p>
        ) : null}
      </section>
    </ContentPanel>
  );
}
