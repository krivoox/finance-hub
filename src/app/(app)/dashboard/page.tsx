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
import { DashboardAccounts } from "@/features/dashboard/components/dashboard-accounts";
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
          <Button asChild className="h-10 w-full rounded-full sm:h-9 sm:w-auto">
            <Link href="/transactions?new=1">Nuevo movimiento</Link>
          </Button>
        ) : undefined
      }
    >
      {/*
        Ordered layout (landing chrome + reference dashboard rhythm):
        1. KPI row — patrimonio / flujo / ingresos / gastos
        2. Main + rail — Sankey | spending · accounts · atención · objetivos
        3. Recent transactions
      */}
      <div className="flex flex-col gap-5 sm:gap-6">
        <DashboardSnapshot
          balance={dashboard.totalBalance}
          balancesByCurrency={dashboard.balancesByCurrency}
          consolidated={dashboard.consolidated}
          fxRate={dashboard.fxRate}
          cashflow={dashboard.monthlyCashflow}
          periodLabel={periodLabel}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.75fr)] lg:items-start lg:gap-6">
          <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
            {hasFlowCharts ? (
              <DashboardFlowCharts
                currency={currency}
                cashflowSankey={cashflowSankey}
                accountSankey={accountSankey}
              />
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
              <DashboardGoals goals={dashboard.goalsProgress} />
              <DashboardAttention
                currency={currency}
                budgetsAtRisk={dashboard.budgetsAtRisk}
                insights={analytics.insights}
                memberBalances={dashboard.memberBalances}
              />
            </div>
          </div>

          <aside className="flex flex-col gap-5 sm:gap-6">
            <DashboardSpending
              currency={currency}
              rows={analytics.spendingByCategory}
            />
            <DashboardAccounts accounts={dashboard.accounts} />
          </aside>
        </div>

        <DashboardRecent
          currency={currency}
          transactions={dashboard.recentTransactions}
        />
      </div>
    </ContentPanel>
  );
}
