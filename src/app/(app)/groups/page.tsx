import { redirect } from "next/navigation";
import { ContentPanel } from "@/components/app-shell/content-panel";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format-money";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
  listMembers,
  listPendingInvitations,
} from "@/features/workspaces/services";
import { getGroupOverview } from "@/features/splits/services";
import { NotAGroupWorkspaceError } from "@/features/splits/domain";
import { NewSettlementForm } from "@/features/splits/components/new-settlement-form";
import { NewGroupWorkspaceForm } from "@/features/workspaces/components/new-group-workspace-form";
import { InviteMemberForm } from "@/features/workspaces/components/invite-member-form";
import { MembersList } from "@/features/workspaces/components/members-list";
import { PendingInvitationsList } from "@/features/workspaces/components/pending-invitations-list";

export default async function GroupsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const active = await getActiveWorkspaceForUser(session.user.id);
  if (!active) {
    return (
      <ContentPanel title="Grupos" description="Gastos compartidos y balances.">
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
        description="Los balances entre miembros solo aplican a workspaces grupales."
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            El workspace activo &ldquo;{active.name}&rdquo; es personal. Creá un
            grupo o cambiá al workspace grupal desde el selector.
          </p>
          <NewGroupWorkspaceForm />
        </div>
      </ContentPanel>
    );
  }

  const canManageMembers =
    active.role === "owner" || active.role === "admin";

  const [overviewResult, members, pending] = await Promise.all([
    getGroupOverview({
      userId: session.user.id,
      workspaceId: active.id,
    }).catch((err: unknown) => {
      if (err instanceof NotAGroupWorkspaceError) return null;
      throw err;
    }),
    listMembers(session.user.id, active.id),
    canManageMembers
      ? listPendingInvitations(session.user.id, active.id)
      : Promise.resolve([]),
  ]);

  if (!overviewResult) {
    return (
      <ContentPanel title="Grupos" description="Gastos compartidos.">
        <p className="text-sm text-muted-foreground">
          Este workspace no es grupal.
        </p>
      </ContentPanel>
    );
  }

  const overview = overviewResult;

  return (
    <ContentPanel
      title="Grupos"
      description="Patrimonio consolidado, miembros e invitaciones."
    >
      <div className="mb-8 space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {overview.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          Patrimonio neto:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatMoney(overview.totalBalance.amountCents, overview.currency)}
          </span>
        </p>
      </div>

      <section className="mb-8">
        <h3 className="mb-3 text-sm font-medium text-foreground">Miembros</h3>
        <MembersList members={members} />
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
      ) : null}

      <section className="mb-8">
        <h3 className="mb-3 text-sm font-medium text-foreground">
          Balances entre miembros
        </h3>
        {overview.memberBalances.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin miembros.</p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.memberBalances.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <p className="font-medium text-foreground">
                  {member.displayName}
                </p>
                <Badge
                  variant={member.netCents >= 0 ? "income" : "expense"}
                  className="tabular-nums"
                >
                  {member.netCents >= 0 ? "Le deben " : "Debe "}
                  {formatMoney(Math.abs(member.netCents), overview.currency)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {active.role !== "viewer" ? (
        <div className="mb-8">
          <NewSettlementForm
            workspaceId={active.id}
            members={overview.members.map((m) => ({
              userId: m.userId,
              displayName: m.displayName,
            }))}
          />
        </div>
      ) : null}

      <section>
        <h3 className="mb-3 text-sm font-medium text-foreground">
          Actividad reciente
        </h3>
        {overview.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos aún.</p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.recentActivity.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {tx.description || tx.categoryName || tx.type}
                  </p>
                  <p className="text-muted-foreground">{tx.accountName}</p>
                </div>
                <span className="tabular-nums text-foreground">
                  {formatMoney(tx.amountCents, tx.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ContentPanel>
  );
}
