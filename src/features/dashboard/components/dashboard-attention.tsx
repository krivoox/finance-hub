import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { formatMoney } from "@/lib/format-money";
import type {
  BudgetAtRiskItem,
  Insight,
  MemberBalanceItem,
} from "@/features/dashboard/domain";

import { formatInsight } from "./format";

type DashboardAttentionProps = {
  currency: string;
  budgetsAtRisk: readonly BudgetAtRiskItem[];
  insights: readonly Insight[];
  memberBalances: readonly MemberBalanceItem[] | null;
};

export function DashboardAttention({
  currency,
  budgetsAtRisk,
  insights,
  memberBalances,
}: DashboardAttentionProps) {
  const hasBudgets = budgetsAtRisk.length > 0;
  const hasInsights = insights.length > 0;
  const hasGroup = memberBalances != null && memberBalances.length > 0;
  const allClear = !hasBudgets && !hasInsights && !hasGroup;

  return (
    <SurfaceSection aria-label="Atención">
      <SurfaceHeader
        title="Atención"
        description="Lo que conviene mirar ahora"
        action={
          hasBudgets ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full"
              asChild
            >
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
                  className="flex items-center justify-between gap-3 px-4 py-3"
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

          {hasGroup ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Balances del grupo
                </h3>
                <Button variant="ghost" size="sm" className="h-8 rounded-full" asChild>
                  <Link href="/groups">Ver grupo</Link>
                </Button>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {memberBalances.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <p className="font-medium text-foreground">
                      {m.displayName ?? m.userId}
                    </p>
                    <Badge
                      variant={m.netCents >= 0 ? "income" : "expense"}
                      className="tabular-nums"
                    >
                      {m.netCents >= 0 ? "Le deben " : "Debe "}
                      {formatMoney(Math.abs(m.netCents), currency)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </SurfaceSection>
  );
}
