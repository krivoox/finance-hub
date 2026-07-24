import Link from "next/link";

import {
  ProgressBar,
  goalProgressTone,
} from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import type { GoalProgressItem } from "@/features/dashboard/domain";

type DashboardGoalsProps = {
  goals: readonly GoalProgressItem[];
};

export function DashboardGoals({ goals }: DashboardGoalsProps) {
  return (
    <SurfaceSection>
      <SurfaceHeader
        title="Objetivos"
        description="Progreso de metas activas"
        action={
          <Button variant="ghost" size="sm" className="h-8 rounded-full" asChild>
            <Link href="/goals">Ver todos</Link>
          </Button>
        }
      />

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay objetivos activos.
        </p>
      ) : (
        <ul className="space-y-4">
          {goals.map((g) => (
            <li key={g.id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate font-medium text-foreground">{g.name}</p>
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                  {g.progressPercent}%
                </span>
              </div>
              <ProgressBar
                value={g.progressPercent}
                tone={goalProgressTone(g.progressPercent)}
                aria-label={`${g.name}: ${g.progressPercent}%`}
              />
            </li>
          ))}
        </ul>
      )}
    </SurfaceSection>
  );
}
