import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { formatMoney } from "@/lib/format-money";
import type { BudgetAtRiskItem, Insight } from "@/features/dashboard/domain";

import { formatInsight } from "./format";

type DashboardAttentionProps = {
  currency: string;
  budgetsAtRisk: readonly BudgetAtRiskItem[];
  insights: readonly Insight[];
};

export function DashboardAttention({
  currency,
  budgetsAtRisk,
  insights,
}: DashboardAttentionProps) {
  const hasBudgets = budgetsAtRisk.length > 0;
  const hasInsights = insights.length > 0;
  const allClear = !hasBudgets && !hasInsights;

  return (
    <SurfaceSection aria-label="Atención">
      <SurfaceHeader
        title="Atención"
        description="Lo que conviene mirar ahora"
        action={
          hasBudgets ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/budgets">Ver presupuestos</Link>
            </Button>
          ) : null
        }
      />

      {allClear ? (
        <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          Sin alertas. Presupuestos y gastos del mes están en orden.
        </p>
      ) : (
        <div className="space-y-4">
          {hasBudgets ? (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {budgetsAtRisk.map((b) => (
                <li
                  key={b.id}
                  className="flex min-w-0 items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {b.name}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatMoney(b.spentCents, currency)} /{" "}
                      {formatMoney(b.limitCents, currency)}
                    </p>
                  </div>
                  <Badge
                    variant={b.status === "exceeded" ? "expense" : "warning"}
                    className="shrink-0"
                  >
                    {b.status === "exceeded" ? "Excedido" : "Alerta"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}

          {hasInsights ? (
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li
                  key={`${insight.kind}-${i}`}
                  className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-foreground text-pretty"
                >
                  {formatInsight(insight, currency)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </SurfaceSection>
  );
}
