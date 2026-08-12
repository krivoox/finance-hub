import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { getCurrentMonthPeriod } from "@/features/dashboard/domain";
import { getDashboard, getAnalytics } from "@/features/dashboard/services";
import { DashboardNewTransactionButton } from "@/features/dashboard/components/dashboard-new-transaction-button";
import { formatPeriodLabel } from "@/features/dashboard/components/format";
import {
  DashboardAccountsSection,
  DashboardAttentionSection,
  DashboardBalanceSection,
  DashboardFlowChartsSection,
  DashboardGoalsSection,
  DashboardRecentSection,
  DashboardRecurringSection,
  DashboardSpendingBarSection,
  DashboardSpendingSection,
} from "@/features/dashboard/components/dashboard-sections";
import {
  DashboardAccountsSkeleton,
  DashboardAttentionSkeleton,
  DashboardBalanceSkeleton,
  DashboardFlowChartsSkeleton,
  DashboardGoalsSkeleton,
  DashboardRecentSkeleton,
  DashboardRecurringSkeleton,
  DashboardSpendingBarSkeleton,
  DashboardSpendingSkeleton,
} from "@/features/dashboard/components/dashboard-skeletons";

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
  // Period label is pure domain (no DB) → the chrome header shows the real
  // month immediately, before any money block streams in.
  const period = getCurrentMonthPeriod(now, timezone);
  const periodLabel = formatPeriodLabel(period.start, timezone);
  const currency = workspace.baseCurrency;
  const canMutate = workspace.role !== "viewer";

  // Kick off both read models now, but DON'T await here: the shared promises
  // let each <Suspense> section stream on its own while the chrome paints
  // instantly. Sharing keeps getDashboard/getAnalytics to a single run each.
  const dashboardPromise = getDashboard({
    userId: session.user.id,
    workspaceId: workspace.id,
    timezone,
    currency,
    now,
  });
  const analyticsPromise = getAnalytics({
    userId: session.user.id,
    workspaceId: workspace.id,
    timezone,
    now,
    budgetsExceededCount: dashboardPromise.then((d) => d.budgetsExceededCount),
  });

  return (
    <ContentPanel
      title="Resumen"
      description={`${workspace.name} · ${periodLabel}`}
      actions={
        canMutate ? (
          <div className="hidden md:block">
            <DashboardNewTransactionButton />
          </div>
        ) : undefined
      }
    >
      {/*
        Orden de lectura del Panel (DESIGN.md §9):
        Móvil (liviano): patrimonio → barra de gastos → actividad → resto below-fold.
        Desktop: hero + rail actividad | objetivos | sankey | …

        Cada sección es un Server Component async con su propio <Suspense>: el
        chrome aparece al instante y los bloques de dinero streamean cuando su
        read model resuelve (SPEC-20 H1/H8). Sin cache de saldos.
      */}
      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)] lg:items-stretch lg:gap-6">
          <Suspense fallback={<DashboardBalanceSkeleton />}>
            <DashboardBalanceSection
              dashboard={dashboardPromise}
              analytics={analyticsPromise}
              periodLabel={periodLabel}
            />
          </Suspense>
          <Suspense fallback={<DashboardSpendingBarSkeleton />}>
            <DashboardSpendingBarSection
              analytics={analyticsPromise}
              currency={currency}
            />
          </Suspense>
          <div className="lg:contents">
            <Suspense fallback={<DashboardRecentSkeleton />}>
              <DashboardRecentSection dashboard={dashboardPromise} />
            </Suspense>
          </div>
        </div>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 lg:items-stretch">
          <Suspense fallback={<DashboardGoalsSkeleton />}>
            <DashboardGoalsSection
              dashboard={dashboardPromise}
              currency={currency}
            />
          </Suspense>
          <Suspense fallback={<DashboardAttentionSkeleton />}>
            <DashboardAttentionSection
              dashboard={dashboardPromise}
              analytics={analyticsPromise}
              currency={currency}
            />
          </Suspense>
        </div>

        <Suspense
          fallback={
            <div className="hidden md:block">
              <DashboardFlowChartsSkeleton />
            </div>
          }
        >
          <DashboardFlowChartsSection
            analytics={analyticsPromise}
            currency={currency}
          />
        </Suspense>

        <Suspense fallback={<DashboardRecurringSkeleton />}>
          <DashboardRecurringSection dashboard={dashboardPromise} />
        </Suspense>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 lg:items-stretch">
          {/* Donut completo en md+; móvil ya vio la barra segmentada arriba. */}
          <div className="hidden md:block">
            <Suspense fallback={<DashboardSpendingSkeleton />}>
              <DashboardSpendingSection
                analytics={analyticsPromise}
                currency={currency}
              />
            </Suspense>
          </div>
          <Suspense fallback={<DashboardAccountsSkeleton />}>
            <DashboardAccountsSection dashboard={dashboardPromise} />
          </Suspense>
        </div>
      </div>
    </ContentPanel>
  );
}
