import Link from "next/link";

import {
  ProgressBar,
  goalProgressTone,
} from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import type { GoalProgressItem } from "@/features/dashboard/domain";

type DashboardGoalsProps = {
  goals: readonly GoalProgressItem[];
};

export function DashboardGoals({ goals }: DashboardGoalsProps) {
  return (
    <section aria-label="Objetivos" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Objetivos</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Progreso de metas activas
          </p>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" asChild>
          <Link href="/goals">Ver todos</Link>
        </Button>
      </div>

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
    </section>
  );
}
