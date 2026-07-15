import Link from "next/link";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { getDashboard, getAnalytics } from "@/features/dashboard/services";
import { DashboardSnapshot } from "@/features/dashboard/components/dashboard-snapshot";
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

  // Shared `now` + request-cached budget snapshot: both share one DB load for
  // budgets/expenses while fetching analytics txs in parallel with dashboard.
  const [dashboard, analytics] = await Promise.all([
    getDashboard({
      userId: session.user.id,
      workspaceId: workspace.id,
      timezone,
      currency: workspace.baseCurrency,
      now,
    }),
    getAnalytics({
      userId: session.user.id,
      workspaceId: workspace.id,
      timezone,
      now,
    }),
  ]);

  const currency = dashboard.currency;
  const periodLabel = formatPeriodLabel(dashboard.period.start, timezone);
  const canMutate = workspace.role !== "viewer";

  return (
    <ContentPanel
      title="Resumen"
      description={`${workspace.name} · ${periodLabel}`}
      actions={
        canMutate ? (
          <Button asChild className="h-10 w-full sm:h-8 sm:w-auto">
            <Link href="/transactions">Nuevo movimiento</Link>
          </Button>
        ) : undefined
      }
    >
      {/*
        Visual rhythm (SPEC-12):
        1. Snapshot — patrimonio + flujo neto (focal)
        2. Atención — alertas / insights / balances de grupo
        3. Progreso + gastos — dos columnas
        4. Actividad — movimientos recientes
      */}
      <div className="space-y-8 sm:space-y-10">
        <DashboardSnapshot
          balance={dashboard.totalBalance}
          cashflow={dashboard.monthlyCashflow}
          periodLabel={periodLabel}
        />

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
