import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Button } from "@/components/ui/button";
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
      description="Quién te debe y a quién le debés. Un grupo es un círculo con nombre: casa, asado, viaje."
      actions={
        groups.length > 0 ? (
          <NewSplitGroupSheet
            trigger={
              <Button className="w-full gap-1.5 sm:w-auto">
                <Plus className="size-4" strokeWidth={1.75} />
                Nuevo grupo
              </Button>
            }
          />
        ) : undefined
      }
    >
      <SplitGroupsDirectory groups={groups} />
    </ContentPanel>
  );
}
