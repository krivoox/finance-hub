import Link from "next/link";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import {
  buildAccountExpenseSankey,
  buildCashflowSankey,
} from "@/features/dashboard/domain";
import { getDashboard, getAnalytics } from "@/features/dashboard/services";
import { DashboardSnapshot } from "@/features/dashboard/components/dashboard-snapshot";
import { DashboardFlowCharts } from "@/features/dashboard/components/dashboard-flow-charts";
import { DashboardAttention } from "@/features/dashboard/components/dashboard-attention";
import { DashboardGoals } from "@/features/dashboard/components/dashboard-goals";
import { DashboardSpending } from "@/features/dashboard/components/dashboard-spending";
import { DashboardRecent } from "@/features/dashboard/components/dashboard-recent";
import { formatPeriodLabel } from "@/features/dashboard/components/format";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [profile, workspace] = await Promise.all([
    getCurrentUser(),
    getActiveWorkspaceForUser(session.user.id),
  ]);

  if (!workspace) {
    return (
      <ContentPanel
        title="Dashboard"
        description="Todavía no tenés un workspace activo."
      >
        <p className="text-sm text-muted-foreground">
          Creá un workspace para empezar a ver tu resumen financiero.
        </p>
      </ContentPanel>
    );
  }

  const timezone = profile?.timezone ?? "UTC";
  const now = new Date();

  // Shared `now` + request-cached budget snapshot. Analytics receives the
  // exceeded count as a Promise so its own tx query starts immediately and
  // still skips a second listBudgetsWithStatus once the snapshot resolves.
  const dashboardPromise = getDashboard({
    userId: session.user.id,
    workspaceId: workspace.id,
    timezone,
    currency: workspace.baseCurrency,
    now,
  });
  const [dashboard, analytics] = await Promise.all([
    dashboardPromise,
    getAnalytics({
      userId: session.user.id,
      workspaceId: workspace.id,
      timezone,
      now,
      budgetsExceededCount: dashboardPromise.then((d) => d.budgetsExceededCount),
    }),
  ]);

  const currency = dashboard.currency;
  const periodLabel = formatPeriodLabel(dashboard.period.start, timezone);
  const canMutate = workspace.role !== "viewer";

  const cashflowSankey = buildCashflowSankey({
    incomeCents: analytics.cashflow.incomeCents,
    expenseCents: analytics.cashflow.expenseCents,
    spendingByCategory: analytics.spendingByCategory,
  });
  const accountSankey = buildAccountExpenseSankey({
    flows: analytics.spendingFlows,
  });
  const hasFlowCharts =
    cashflowSankey.nodes.length > 0 || accountSankey.nodes.length > 0;

  return (
    <ContentPanel
      title="Resumen"
      description={`${workspace.name} · ${periodLabel}`}
      actions={
        canMutate ? (
          <Button asChild className="h-10 w-full sm:h-8 sm:w-auto">
            <Link href="/transactions?new=1">Nuevo movimiento</Link>
          </Button>
        ) : undefined
      }
    >
      {/*
        Visual rhythm (SPEC-12):
        1. Snapshot — patrimonio + flujo neto (focal)
        2. Sankey — flujo ingresos → gastos / disponible
        3. Atención — alertas / insights / balances de grupo
        4. Progreso + gastos — dos columnas
        5. Actividad — movimientos recientes
      */}
      <div className="flex flex-col gap-8 sm:gap-10">
        <DashboardSnapshot
          balance={dashboard.totalBalance}
          balancesByCurrency={dashboard.balancesByCurrency}
          consolidated={dashboard.consolidated}
          fxRate={dashboard.fxRate}
          cashflow={dashboard.monthlyCashflow}
          periodLabel={periodLabel}
        />

        {hasFlowCharts ? (
          <DashboardFlowCharts
            currency={currency}
            cashflowSankey={cashflowSankey}
            accountSankey={accountSankey}
          />
        ) : null}

        <div className="border-t border-border pt-6 sm:pt-8">
          <DashboardAttention
            currency={currency}
            budgetsAtRisk={dashboard.budgetsAtRisk}
            insights={analytics.insights}
            memberBalances={dashboard.memberBalances}
          />
        </div>

        <div className="grid gap-8 border-t border-border pt-6 sm:pt-8 lg:grid-cols-2 lg:gap-12">
          <DashboardGoals goals={dashboard.goalsProgress} />
          <DashboardSpending
            currency={currency}
            rows={analytics.spendingByCategory}
          />
        </div>

        <div className="border-t border-border pt-6 sm:pt-8">
          <DashboardRecent
            currency={currency}
            transactions={dashboard.recentTransactions}
          />
        </div>
      </div>
    </ContentPanel>
  );
}
