import "server-only";

import { Suspense } from "react";
import dynamic from "next/dynamic";

import {
  buildAccountExpenseSankey,
  buildCashflowSankey,
  buildNetTrend,
} from "@/features/dashboard/domain";
import type {
  GetAnalyticsHomeResult,
  GetAnalyticsResult,
  GetDashboardResult,
} from "@/features/dashboard/services";

import { DashboardBalance } from "./dashboard-balance";
import {
  DashboardBalanceTrend,
  DashboardBalanceTrendSkeleton,
} from "./dashboard-balance-trend";
import { DashboardAttention } from "./dashboard-attention";
import { DashboardGoals } from "./dashboard-goals";
import { DashboardSpending } from "./dashboard-spending";
import { DashboardSpendingBar } from "./dashboard-spending-bar";
import { DashboardRecent } from "./dashboard-recent";
import { DashboardRecurring } from "./dashboard-recurring";
import { DashboardAccounts } from "./dashboard-accounts";
import { DashboardMobileHome } from "./dashboard-mobile-home";
import {
  DashboardAccountsSkeleton,
  DashboardAttentionSkeleton,
  DashboardBalanceSkeleton,
  DashboardFlowChartsSkeleton,
  DashboardGoalsSkeleton,
  DashboardRecentSkeleton,
  DashboardRecurringSkeleton,
  DashboardSpendingSkeleton,
} from "./dashboard-skeletons";

const DashboardFlowCharts = dynamic(
  () =>
    import("./dashboard-flow-charts").then((mod) => mod.DashboardFlowCharts),
  { loading: () => <DashboardFlowChartsSkeleton /> },
);

/**
 * Streaming sections for the Panel (SPEC-20 H1/H8).
 *
 * `fh-shell` chooses which read model the route starts: compact →
 * `getAnalyticsHome` only; full → `getDashboard` + `getAnalytics`. Each
 * section awaits only the data it needs. No money is cached across requests.
 */

type DashboardPromise = Promise<GetDashboardResult>;
type AnalyticsPromise = Promise<GetAnalyticsResult>;
type AnalyticsHomePromise = Promise<GetAnalyticsHomeResult>;

type BalanceSectionProps = {
  dashboard: DashboardPromise;
  analytics: AnalyticsPromise;
  periodLabel: string;
};

async function DashboardBalanceTrendSection({
  analytics,
  currency,
}: {
  analytics: AnalyticsPromise;
  currency: string;
}) {
  const a = await analytics;
  return (
    <DashboardBalanceTrend
      netTrend={buildNetTrend(a.monthlySeries)}
      currency={currency}
    />
  );
}

export async function DashboardBalanceSection({
  dashboard,
  analytics,
  periodLabel,
}: BalanceSectionProps) {
  // Await only the dashboard read model so patrimonio + cashflow KPIs paint
  // in the first wave. Trend (analytics) streams behind a nested Suspense.
  const d = await dashboard;

  return (
    <DashboardBalance
      balance={d.totalBalance}
      balancesByCurrency={d.balancesByCurrency}
      consolidated={d.consolidated}
      fxRate={d.fxRate}
      cashflow={d.monthlyCashflow}
      periodLabel={periodLabel}
      trend={
        <Suspense fallback={<DashboardBalanceTrendSkeleton />}>
          <DashboardBalanceTrendSection
            analytics={analytics}
            currency={d.monthlyCashflow.currency}
          />
        </Suspense>
      }
    />
  );
}

export async function DashboardSpendingBarSection({
  analytics,
  currency,
}: {
  analytics: AnalyticsPromise;
  currency: string;
}) {
  const a = await analytics;
  return (
    <DashboardSpendingBar
      currency={currency}
      rows={a.spendingByCategory}
      limit={3}
    />
  );
}

export async function DashboardMobileHomeSection({
  home,
  currency,
}: {
  home: AnalyticsHomePromise;
  currency: string;
}) {
  const a = await home;
  return (
    <DashboardMobileHome
      currency={currency}
      monthlySeries={a.monthlySeries}
      monthlyCategorySpending={a.monthlyCategorySpending}
    />
  );
}

export async function DashboardRecentSection({
  dashboard,
}: {
  dashboard: DashboardPromise;
}) {
  const d = await dashboard;
  return <DashboardRecent transactions={d.recentTransactions} limit={4} />;
}

export async function DashboardGoalsSection({
  dashboard,
  currency,
}: {
  dashboard: DashboardPromise;
  currency: string;
}) {
  const d = await dashboard;
  return <DashboardGoals currency={currency} goals={d.goalsProgress} />;
}

export async function DashboardAttentionSection({
  dashboard,
  analytics,
  currency,
}: {
  dashboard: DashboardPromise;
  analytics: AnalyticsPromise;
  currency: string;
}) {
  const [d, a] = await Promise.all([dashboard, analytics]);
  return (
    <DashboardAttention
      currency={currency}
      budgetsAtRisk={d.budgetsAtRisk}
      insights={a.insights}
    />
  );
}

export async function DashboardFlowChartsSection({
  analytics,
  currency,
}: {
  analytics: AnalyticsPromise;
  currency: string;
}) {
  const a = await analytics;
  const cashflowSankey = buildCashflowSankey({
    incomeCents: a.cashflow.incomeCents,
    expenseCents: a.cashflow.expenseCents,
    spendingByCategory: a.spendingByCategory,
  });
  const accountSankey = buildAccountExpenseSankey({ flows: a.spendingFlows });
  const hasFlowCharts =
    cashflowSankey.nodes.length > 0 || accountSankey.nodes.length > 0;

  if (!hasFlowCharts) return null;

  // Desktop-only surface; kept on the element itself so an empty result adds
  // no phantom flex gap (no wrapper item reserved when there's no flow data).
  return (
    <div className="hidden md:block">
      <DashboardFlowCharts
        currency={currency}
        cashflowSankey={cashflowSankey}
        accountSankey={accountSankey}
      />
    </div>
  );
}

export async function DashboardRecurringSection({
  dashboard,
}: {
  dashboard: DashboardPromise;
}) {
  const d = await dashboard;
  return <DashboardRecurring items={d.upcomingRecurring} />;
}

export async function DashboardSpendingSection({
  analytics,
  currency,
}: {
  analytics: AnalyticsPromise;
  currency: string;
}) {
  const a = await analytics;
  return <DashboardSpending currency={currency} rows={a.spendingByCategory} />;
}

export async function DashboardAccountsSection({
  dashboard,
}: {
  dashboard: DashboardPromise;
}) {
  const d = await dashboard;
  return <DashboardAccounts accounts={d.accounts} />;
}

/** Desktop Panel composition. Only mount when `fh-shell=full` so compact skips this work. */
export function DashboardDesktopSections({
  dashboard,
  analytics,
  currency,
  periodLabel,
}: {
  dashboard: DashboardPromise;
  analytics: AnalyticsPromise;
  currency: string;
  periodLabel: string;
}) {
  return (
    <>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-stretch lg:gap-6">
        <Suspense fallback={<DashboardBalanceSkeleton />}>
          <DashboardBalanceSection
            dashboard={dashboard}
            analytics={analytics}
            periodLabel={periodLabel}
          />
        </Suspense>
        <div className="lg:contents">
          <Suspense fallback={<DashboardRecentSkeleton />}>
            <DashboardRecentSection dashboard={dashboard} />
          </Suspense>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-2 lg:items-stretch">
        <Suspense fallback={<DashboardGoalsSkeleton />}>
          <DashboardGoalsSection dashboard={dashboard} currency={currency} />
        </Suspense>
        <Suspense fallback={<DashboardAttentionSkeleton />}>
          <DashboardAttentionSection
            dashboard={dashboard}
            analytics={analytics}
            currency={currency}
          />
        </Suspense>
      </div>

      <Suspense fallback={<DashboardFlowChartsSkeleton />}>
        <DashboardFlowChartsSection analytics={analytics} currency={currency} />
      </Suspense>

      <Suspense fallback={<DashboardRecurringSkeleton />}>
        <DashboardRecurringSection dashboard={dashboard} />
      </Suspense>

      <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-2 lg:items-stretch">
        <Suspense fallback={<DashboardSpendingSkeleton />}>
          <DashboardSpendingSection analytics={analytics} currency={currency} />
        </Suspense>
        <Suspense fallback={<DashboardAccountsSkeleton />}>
          <DashboardAccountsSection dashboard={dashboard} />
        </Suspense>
      </div>
    </>
  );
}
