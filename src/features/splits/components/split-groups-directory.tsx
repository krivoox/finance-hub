import { Button } from "@/components/ui/button";
import type { ListedSplitGroup } from "@/features/splits/services";
import { NewSplitGroupSheet } from "./new-split-group-sheet";
import { SplitGroupCard } from "./split-group-card";
import { SplitGroupsEmpty } from "./split-groups-empty";

export function SplitGroupsDirectory({
  groups,
}: {
  groups: readonly ListedSplitGroup[];
}) {
  if (groups.length === 0) {
    return <SplitGroupsEmpty />;
  }

  return (
    <div className="space-y-4">
      <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <li key={group.id} className="min-w-0">
            <SplitGroupCard group={group} />
          </li>
        ))}
      </ul>
      <NewSplitGroupSheet
        trigger={
          <Button variant="outline" className="h-11 w-full rounded-xl border-dashed">
            Crear un grupo
          </Button>
        }
      />
    </div>
  );
}
