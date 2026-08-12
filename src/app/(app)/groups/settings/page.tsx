import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ContentPanel } from "@/components/app-shell/content-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
  listMembers,
  listPendingInvitations,
  type ActiveWorkspaceContext,
} from "@/features/workspaces/services";
import { GroupsSectionNav } from "@/features/splits/components/groups-section-nav";
import { NewGroupWorkspaceForm } from "@/features/workspaces/components/new-group-workspace-form";
import { InviteMemberForm } from "@/features/workspaces/components/invite-member-form";
import { MembersManagement } from "@/features/workspaces/components/members-management";
import { PendingInvitationsList } from "@/features/workspaces/components/pending-invitations-list";
import { RenameWorkspaceForm } from "@/features/workspaces/components/rename-workspace-form";
import { LeaveGroupButton } from "@/features/workspaces/components/leave-group-button";
import { DeleteGroupDialog } from "@/features/workspaces/components/delete-group-dialog";

type MembersResult = Awaited<ReturnType<typeof listMembers>>;
type PendingResult = Awaited<ReturnType<typeof listPendingInvitations>>;
type WorkspaceRole = ActiveWorkspaceContext["role"];

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

  // Kick off the member/invitation reads now, but DON'T await here: the chrome,
  // section nav, group name and the rename form (all workspace-only) paint
  // instantly while the members list, pending invitations and the leave button
  // (which needs the owner count) stream behind their own <Suspense>. The shared
  // members promise runs once for both the list and the danger zone.
  const membersPromise = listMembers(session.user.id, active.id);
  const pendingPromise: Promise<PendingResult> = canManageMembers
    ? listPendingInvitations(session.user.id, active.id)
    : Promise.resolve([]);

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
        <Suspense fallback={<MembersSkeleton />}>
          <MembersSection
            workspaceId={active.id}
            currentUserId={session.user.id}
            currentRole={active.role}
            members={membersPromise}
          />
        </Suspense>
      </section>

      {canManageMembers ? (
        <section className="mb-8 space-y-6">
          <InviteMemberForm workspaceId={active.id} />
          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">
              Invitaciones pendientes
            </h3>
            <Suspense fallback={<PendingInvitationsSkeleton />}>
              <PendingInvitationsSection pending={pendingPromise} />
            </Suspense>
          </div>
        </section>
      ) : (
        <p className="mb-8 text-sm text-muted-foreground">
          Solo owners y admins pueden invitar o gestionar pendientes.
        </p>
      )}

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Zona de peligro</h3>
        <Suspense fallback={<LeaveButtonSkeleton />}>
          <LeaveGroupSection
            workspaceId={active.id}
            workspaceName={active.name}
            currentRole={active.role}
            members={membersPromise}
          />
        </Suspense>
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

async function MembersSection({
  workspaceId,
  currentUserId,
  currentRole,
  members,
}: {
  workspaceId: string;
  currentUserId: string;
  currentRole: WorkspaceRole;
  members: Promise<MembersResult>;
}) {
  const memberList = await members;

  return (
    <MembersManagement
      workspaceId={workspaceId}
      members={memberList}
      currentUserId={currentUserId}
      currentRole={currentRole}
    />
  );
}

async function PendingInvitationsSection({
  pending,
}: {
  pending: Promise<PendingResult>;
}) {
  const pendingList = await pending;

  return (
    <PendingInvitationsList
      appBaseUrl={env.BETTER_AUTH_URL}
      invitations={pendingList.map((p) => ({
        id: p.id,
        email: p.email,
        role: p.role,
        token: p.token,
        expiresOn: p.expiresAt.toISOString().slice(0, 10),
      }))}
    />
  );
}

async function LeaveGroupSection({
  workspaceId,
  workspaceName,
  currentRole,
  members,
}: {
  workspaceId: string;
  workspaceName: string;
  currentRole: WorkspaceRole;
  members: Promise<MembersResult>;
}) {
  const memberList = await members;
  const ownerCount = memberList.filter((m) => m.role === "owner").length;
  const isLastOwner = currentRole === "owner" && ownerCount <= 1;

  return (
    <LeaveGroupButton
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      canLeave={!isLastOwner}
      blockedReason={
        isLastOwner
          ? "Sos el único owner. Transferí la propiedad a otro miembro antes de salir."
          : undefined
      }
    />
  );
}

function MembersSkeleton() {
  return (
    <ul
      className="divide-y divide-border rounded-lg border border-border"
      aria-busy
      aria-label="Cargando miembros"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

function PendingInvitationsSkeleton() {
  return (
    <ul className="space-y-2" aria-busy aria-label="Cargando invitaciones">
      {Array.from({ length: 2 }).map((_, i) => (
        <li key={i}>
          <Skeleton className="h-12 w-full rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

function LeaveButtonSkeleton() {
  return <Skeleton className="h-10 w-40 max-w-full rounded-md" />;
}
