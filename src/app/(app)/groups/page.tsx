import { redirect } from "next/navigation";
import { ContentPanel } from "@/components/app-shell/content-panel";
import { getSession } from "@/lib/session";
import { listMyWorkspaces } from "@/features/workspaces/services";
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

  const workspaces = await listMyWorkspaces(session.user.id);
  const groups = workspaces.filter((workspace) => workspace.type === "group");

  return (
    <ContentPanel
      title="Grupos"
      description="Tus espacios compartidos."
      actions={groups.length > 0 ? <NewGroupSheet /> : undefined}
    >
      <GroupsDirectory userId={session.user.id} groups={groups} />
    </ContentPanel>
  );
}
