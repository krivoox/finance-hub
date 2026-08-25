import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { getShellLayout } from "@/components/app-shell/get-shell-layout";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { getCurrentMonthPeriod } from "@/features/dashboard/domain";
import {
  getAnalytics,
  getAnalyticsHome,
  getDashboard,
} from "@/features/dashboard/services";
import { DashboardNewTransactionButton } from "@/features/dashboard/components/dashboard-new-transaction-button";
import { formatPeriodLabel } from "@/features/dashboard/components/format";
import {
  DashboardDesktopSections,
  DashboardMobileHomeSection,
} from "@/features/dashboard/components/dashboard-sections";
import {
  DashboardDesktopFallback,
  DashboardMobileHomeSkeleton,
} from "@/features/dashboard/components/dashboard-skeletons";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [profile, workspace, shellLayout] = await Promise.all([
    getCurrentUser(),
    getActiveWorkspaceForUser(session.user.id),
    getShellLayout(),
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
  const isCompact = shellLayout === "compact";

  // Compact (phone, or first visit): only the light home slice.
  // Full (`md+`, cookie): desktop read models — do not start GetDashboard
  // on a phone; CSS hide does not skip RSC.
  const homePromise = isCompact
    ? getAnalyticsHome({
        userId: session.user.id,
        workspaceId: workspace.id,
        timezone,
        now,
      })
    : null;
  const dashboardPromise = isCompact
    ? null
    : getDashboard({
        userId: session.user.id,
        workspaceId: workspace.id,
        timezone,
        currency,
        now,
      });
  const analyticsPromise = isCompact
    ? null
    : getAnalytics({
        userId: session.user.id,
        workspaceId: workspace.id,
        timezone,
        now,
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
        Móvil: barras de gasto mensual + card de categorías (donut).
        Desktop: patrimonio + KPIs + actividad | objetivos | sankey | …

        `fh-shell` (matchMedia `md`, no UA) picks the tree. The other
        breakpoint gets skeletons until ShellLayoutSync refreshes.
        SPEC-20: no cache of saldos.
      */}
      <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
        <div className="md:hidden">
          {homePromise ? (
            <Suspense fallback={<DashboardMobileHomeSkeleton />}>
              <DashboardMobileHomeSection
                home={homePromise}
                currency={currency}
              />
            </Suspense>
          ) : (
            <DashboardMobileHomeSkeleton />
          )}
        </div>

        <div className="hidden min-w-0 flex-col gap-5 sm:gap-6 md:flex">
          {dashboardPromise && analyticsPromise ? (
            <DashboardDesktopSections
              dashboard={dashboardPromise}
              analytics={analyticsPromise}
              currency={currency}
              periodLabel={periodLabel}
            />
          ) : (
            <DashboardDesktopFallback />
          )}
        </div>
      </div>
    </ContentPanel>
  );
}
