import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import {
  buildAccountExpenseSankey,
  buildCashflowSankey,
  buildNetTrend,
} from "@/features/dashboard/domain";
import { getDashboard, getAnalytics } from "@/features/dashboard/services";
import { DashboardBalance } from "@/features/dashboard/components/dashboard-balance";
import { DashboardFlowCharts } from "@/features/dashboard/components/dashboard-flow-charts";
import { DashboardAttention } from "@/features/dashboard/components/dashboard-attention";
import { DashboardGoals } from "@/features/dashboard/components/dashboard-goals";
import { DashboardSpending } from "@/features/dashboard/components/dashboard-spending";
import { DashboardRecent } from "@/features/dashboard/components/dashboard-recent";
import { DashboardRecurring } from "@/features/dashboard/components/dashboard-recurring";
import { DashboardAccounts } from "@/features/dashboard/components/dashboard-accounts";
import { DashboardNewTransactionButton } from "@/features/dashboard/components/dashboard-new-transaction-button";
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
        title="Panel"
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
  const netTrend = buildNetTrend(analytics.monthlySeries);

  return (
    <ContentPanel
      title="Resumen"
      description={`${workspace.name} · ${periodLabel}`}
      actions={canMutate ? <DashboardNewTransactionButton /> : undefined}
    >
      {/*
        Orden de lectura del Panel (DESIGN.md §9):
        1. Patrimonio + flujo neto mensual | Últimos movimientos
        2. Objetivos | Atención
        3. Flujo del mes (Sankey)
        4. Próximas recurrentes
        5. Distribución de gastos | Cuentas
      */}
      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)] lg:items-stretch lg:gap-6">
          <DashboardBalance
            balance={dashboard.totalBalance}
            balancesByCurrency={dashboard.balancesByCurrency}
            consolidated={dashboard.consolidated}
            fxRate={dashboard.fxRate}
            cashflow={dashboard.monthlyCashflow}
            netTrend={netTrend}
            periodLabel={periodLabel}
          />
          <DashboardRecent transactions={dashboard.recentTransactions} />
        </div>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 lg:items-stretch">
          <DashboardGoals currency={currency} goals={dashboard.goalsProgress} />
          <DashboardAttention
            currency={currency}
            budgetsAtRisk={dashboard.budgetsAtRisk}
            insights={analytics.insights}
            memberBalances={dashboard.memberBalances}
          />
        </div>

        {hasFlowCharts ? (
          <DashboardFlowCharts
            currency={currency}
            cashflowSankey={cashflowSankey}
            accountSankey={accountSankey}
          />
        ) : null}

        <DashboardRecurring items={dashboard.upcomingRecurring} />

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 lg:items-stretch">
          <DashboardSpending
            currency={currency}
            rows={analytics.spendingByCategory}
          />
          <DashboardAccounts accounts={dashboard.accounts} />
        </div>
      </div>
    </ContentPanel>
  );
}
