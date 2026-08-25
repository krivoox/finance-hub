import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ContentPanel } from "@/components/app-shell/content-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";
import {
  listMyWorkspaces,
  type WorkspaceSummary,
} from "@/features/workspaces/services";
import { NewGroupSheet } from "@/features/workspaces/components/new-group-sheet";
import { GroupsDirectory } from "@/features/splits/components/groups-directory";

/**
 * `/groups` is the “Mis grupos” directory (DESIGN.md §9).
 *
 * Page-level KPIs “Total que debés / Total a tu favor” are omitted: no domain
 * query aggregates `netCents` across group workspaces, and groups may use
 * different `baseCurrency`. Per-card signed balance, last activity, members
 * and count come from `getGroupOverview` for that workspace id.
 */
export default async function GroupsDirectoryPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const workspacesPromise = listMyWorkspaces(session.user.id);

  return (
    <ContentPanel
      title="Grupos"
      description="Tus espacios compartidos."
      actions={<NewGroupSheet />}
    >
      <Suspense fallback={<GroupsDirectorySkeleton />}>
        <GroupsDirectorySection
          userId={session.user.id}
          workspaces={workspacesPromise}
        />
      </Suspense>
    </ContentPanel>
  );
}

async function GroupsDirectorySection({
  userId,
  workspaces,
}: {
  userId: string;
  workspaces: Promise<WorkspaceSummary[]>;
}) {
  const list = await workspaces;
  const groups = list.filter((workspace) => workspace.type === "group");
  return <GroupsDirectory userId={userId} groups={groups} />;
}

function GroupsDirectorySkeleton() {
  return (
    <ul
      className="grid min-w-0 gap-3 sm:grid-cols-2"
      aria-busy
      aria-label="Cargando grupos"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-4 w-24" />
          <Skeleton className="mt-6 h-8 w-28" />
        </li>
      ))}
    </ul>
  );
}
