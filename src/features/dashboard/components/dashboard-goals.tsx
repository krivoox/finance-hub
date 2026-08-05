import Link from "next/link";

import { ProgressBar, goalProgressTone } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { formatMoney } from "@/lib/format-money";
import type { GoalProgressItem } from "@/features/dashboard/domain";

type DashboardGoalsProps = {
  currency: string;
  goals: readonly GoalProgressItem[];
};

export function DashboardGoals({ currency, goals }: DashboardGoalsProps) {
  const visible = goals.slice(0, 3);

  return (
    <SurfaceSection className="flex h-full flex-col">
      <SurfaceHeader
        title="Objetivos"
        description="Progreso de metas activas"
        action={
          <Button variant="ghost" size="sm" className="h-8 rounded-full" asChild>
            <Link href="/goals">Ver todos</Link>
          </Button>
        }
      />

      {visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground text-pretty">
            Todavía no hay objetivos activos. Definí una meta para seguir tu
            ahorro mes a mes.
          </p>
          <Button variant="outline" size="sm" className="h-9 rounded-full" asChild>
            <Link href="/goals">Crear objetivo</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((goal) => (
            <li key={goal.id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium text-foreground">
                  {goal.name}
                </p>
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                  {goal.progressPercent}%
                </span>
              </div>
              <ProgressBar
                value={goal.progressPercent}
                tone={goalProgressTone(goal.progressPercent)}
                aria-label={`${goal.name}: ${goal.progressPercent}%`}
              />
              <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {formatMoney(goal.currentAmountCents, currency)}
                </span>
                <span className="tabular-nums">
                  Objetivo {formatMoney(goal.targetAmountCents, currency)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SurfaceSection>
  );
}
