import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ContentPanel } from "@/components/app-shell/content-panel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format-money";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { getGroupOverview } from "@/features/splits/services";
import { NotAGroupWorkspaceError } from "@/features/splits/domain";
import { GroupsSectionNav } from "@/features/splits/components/groups-section-nav";
import { NewGroupWorkspaceForm } from "@/features/workspaces/components/new-group-workspace-form";

type GroupOverview = Awaited<ReturnType<typeof getGroupOverview>> | null;

export default async function GroupsActivityPage() {
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

  // Kick off the group read model now, but DON'T await here: the chrome + the
  // section nav paint instantly while balances and activity stream behind a
  // <Suspense>. No money is cached — this only reorders when the body paints.
  const overviewPromise = getGroupOverview({
    userId: session.user.id,
    workspaceId: active.id,
  }).catch((err: unknown) => {
    if (err instanceof NotAGroupWorkspaceError) return null;
    throw err;
  });

  return (
    <ContentPanel
      title="Grupos"
      description="Balances entre miembros y actividad compartida."
    >
      <GroupsSectionNav active="activity" />

      <Suspense fallback={<GroupOverviewSkeleton />}>
        <GroupOverviewSection overview={overviewPromise} />
      </Suspense>
    </ContentPanel>
  );
}

async function GroupOverviewSection({
  overview: overviewPromise,
}: {
  overview: Promise<GroupOverview>;
}) {
  const overview = await overviewPromise;

  if (!overview) {
    return (
      <p className="text-sm text-muted-foreground">
        Este workspace no es grupal.
      </p>
    );
  }

  return (
    <>
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
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 sm:items-center"
              >
                <p className="min-w-0 truncate font-medium text-foreground">
                  {member.displayName}
                </p>
                <Badge
                  variant={member.netCents >= 0 ? "income" : "expense"}
                  className="shrink-0 tabular-nums"
                >
                  {member.netCents >= 0 ? "Le deben " : "Debe "}
                  {formatMoney(Math.abs(member.netCents), overview.currency)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium text-foreground">
          Actividad reciente
        </h3>
        {overview.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos aún.</p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.recentActivity.map((tx) => (
              <li key={tx.id} className="first:pt-0 last:pb-0">
                <Link
                  href={`/transactions/${tx.id}`}
                  className="flex items-start justify-between gap-3 py-3 text-sm hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {tx.description || tx.categoryName || tx.type}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {tx.accountName}
                      <span className="text-border"> · </span>
                      Registró {tx.createdByDisplayName}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums text-foreground">
                    {formatMoney(tx.amountCents, tx.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/**
 * Group overview fallback (SPEC-20): net worth + balances + activity rows while
 * the read model streams. Never renders real amounts — money stays fresh.
 */
function GroupOverviewSkeleton() {
  return (
    <div aria-busy aria-label="Cargando grupo">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-6 w-48 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>

      <section className="mb-8 space-y-3">
        <Skeleton className="h-4 w-40" />
        <ul className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <Skeleton className="h-4 w-32 max-w-full" />
              <Skeleton className="h-6 w-28 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <ul className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
