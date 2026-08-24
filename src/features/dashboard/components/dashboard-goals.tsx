import Link from "next/link";
import { Target } from "lucide-react";

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
          <Button variant="ghost" size="sm" asChild>
            <Link href="/goals">Ver todos</Link>
          </Button>
        }
      />

      {visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-start gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
            aria-hidden
          >
            <Target className="size-5" strokeWidth={1.75} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Sin objetivos activos
            </p>
            <p className="text-sm text-muted-foreground text-pretty">
              Definí una meta para seguir tu ahorro mes a mes.
            </p>
          </div>
          <Button variant="outline" asChild>
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
                <span className="shrink-0 text-xs font-medium tabular text-muted-foreground">
                  {goal.progressPercent}%
                </span>
              </div>
              <ProgressBar
                value={goal.progressPercent}
                tone={goalProgressTone(goal.progressPercent)}
                aria-label={`${goal.name}: ${goal.progressPercent}%`}
              />
              <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                <span className="tabular">
                  {formatMoney(goal.currentAmountCents, currency)}
                </span>
                <span className="tabular">
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
