import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ContentPanel } from "@/components/app-shell/content-panel";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { getGroupOverview } from "@/features/splits/services";
import { NotAGroupWorkspaceError } from "@/features/splits/domain";
import { GroupsSectionNav } from "@/features/splits/components/groups-section-nav";
import {
  GroupOverviewSection,
  GroupOverviewSkeleton,
} from "@/features/splits/components/group-overview";

export default async function GroupsActivityPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const active = await getActiveWorkspaceForUser(session.user.id);
  if (!active || active.type !== "group") {
    redirect("/groups");
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
