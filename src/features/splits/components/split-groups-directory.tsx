import { Badge } from "@/components/ui/badge";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import type { ListedSplitGroup } from "@/features/splits/services";
import { SplitGroupCard } from "./split-group-card";
import { SplitGroupsEmpty } from "./split-groups-empty";
import {
  groupCountLabel,
  splitGroupKindLabel,
  type SplitGroupKindUi,
} from "./split-copy";

const KIND_ORDER: SplitGroupKindUi[] = ["ongoing", "one_time"];

export function SplitGroupsDirectory({
  groups,
}: {
  groups: readonly ListedSplitGroup[];
}) {
  if (groups.length === 0) {
    return <SplitGroupsEmpty />;
  }

  const sections = KIND_ORDER.map((kind) => ({
    kind,
    items: groups.filter((group) => group.kind === kind),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {sections.map((section) => (
        <SurfaceSection
          key={section.kind}
          aria-label={splitGroupKindLabel(section.kind)}
        >
          <SurfaceHeader
            title={splitGroupKindLabel(section.kind)}
            action={
              <Badge variant="outline" className="h-5 px-1.5 text-xs">
                {groupCountLabel(section.items.length)}
              </Badge>
            }
          />
          <ul className="-mx-2 divide-y divide-border">
            {section.items.map((group) => (
              <li key={group.id} className="min-w-0">
                <SplitGroupCard group={group} />
              </li>
            ))}
          </ul>
        </SurfaceSection>
      ))}
    </div>
  );
}
