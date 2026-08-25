import { redirect } from "next/navigation";
import { ContentPanel } from "@/components/app-shell/content-panel";
import { getSession } from "@/lib/session";
import { listMySplitGroups } from "@/features/splits/services";
import { SplitGroupsDirectory } from "@/features/splits/components/split-groups-directory";
import { NewSplitGroupSheet } from "@/features/splits/components/new-split-group-sheet";

export default async function GroupsDirectoryPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const groups = await listMySplitGroups(session.user.id);

  return (
    <ContentPanel
      title="Grupos"
      description="Gastos divididos con quien sea, tenga o no la app."
      actions={groups.length > 0 ? <NewSplitGroupSheet /> : undefined}
    >
      <SplitGroupsDirectory groups={groups} />
    </ContentPanel>
  );
}
