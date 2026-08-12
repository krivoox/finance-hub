import { Skeleton } from "@/components/ui/skeleton";
import { SurfaceSection } from "@/components/surface-section";
import { cn } from "@/lib/utils";

/**
 * Per-section skeletons for the Panel (SPEC-20 H1/H8).
 *
 * Each fallback mirrors the shape of its resolved surface so the streaming
 * swap doesn't shift layout: same SurfaceSection chrome, same block sizes.
 * They never render real numbers — money stays fresh (`staleTimes.dynamic: 0`).
 */

function SurfaceHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-2">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-40 max-w-full" />
      </div>
      {withAction ? <Skeleton className="h-8 w-20 rounded-full" /> : null}
    </div>
  );
}

function ListRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-2.5">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-3.5 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export function DashboardBalanceSkeleton() {
  return (
    <SurfaceSection aria-label="Cargando patrimonio" className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-44 sm:h-10 sm:w-56" />
        </div>
        <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
      </div>

      <div className="mt-4 hidden border-t border-border pt-4 md:block sm:mt-5">
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:mt-5 sm:grid-cols-3 sm:gap-4">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="col-span-2 h-12 rounded-lg sm:col-span-1" />
      </div>
    </SurfaceSection>
  );
}

export function DashboardSpendingBarSkeleton() {
  return (
    <SurfaceSection aria-label="Cargando gastos del mes" className="md:hidden">
      <SurfaceHeaderSkeleton />
      <Skeleton className="mt-1 h-2.5 w-full rounded-full" />
      <ul className="mt-3 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <Skeleton className="size-2 shrink-0 rounded-full" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3 w-8 shrink-0" />
          </li>
        ))}
      </ul>
    </SurfaceSection>
  );
}

export function DashboardRecentSkeleton() {
  return (
    <SurfaceSection aria-label="Cargando actividad reciente" className="flex h-full flex-col">
      <SurfaceHeaderSkeleton />
      <ListRowsSkeleton rows={4} />
    </SurfaceSection>
  );
}

export function DashboardGoalsSkeleton() {
  return (
    <SurfaceSection aria-label="Cargando objetivos" className="flex h-full flex-col">
      <SurfaceHeaderSkeleton />
      <ul className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex items-baseline justify-between gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </li>
        ))}
      </ul>
    </SurfaceSection>
  );
}

export function DashboardAttentionSkeleton() {
  return (
    <SurfaceSection aria-label="Cargando atención" className="h-full">
      <SurfaceHeaderSkeleton />
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </SurfaceSection>
  );
}

export function DashboardFlowChartsSkeleton() {
  return (
    <SurfaceSection aria-label="Cargando flujo del mes" className="h-full">
      <SurfaceHeaderSkeleton withAction={false} />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      <Skeleton className="mt-3 h-48 w-full rounded-xl" />
    </SurfaceSection>
  );
}

export function DashboardRecurringSkeleton() {
  return (
    <SurfaceSection aria-label="Cargando recurrentes" className="flex h-full flex-col">
      <SurfaceHeaderSkeleton />
      <ul className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl bg-background/60 px-2.5 py-2 dark:bg-background/40">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-3.5 w-14 shrink-0" />
          </li>
        ))}
      </ul>
    </SurfaceSection>
  );
}

export function DashboardSpendingSkeleton() {
  return (
    <SurfaceSection aria-label="Cargando distribución de gastos" className="flex h-full flex-col">
      <SurfaceHeaderSkeleton />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-4">
        <Skeleton className="mx-auto size-40 shrink-0 rounded-full sm:mx-0 sm:size-48 sm:flex-[1.2]" />
        <ul className="min-w-0 flex-1 space-y-2 sm:max-w-[13.5rem]">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-2">
              <Skeleton className="size-2 shrink-0 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3 w-10 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </SurfaceSection>
  );
}

export function DashboardAccountsSkeleton() {
  return (
    <SurfaceSection aria-label="Cargando cuentas" className="flex h-full flex-col">
      <SurfaceHeaderSkeleton />
      <ListRowsSkeleton rows={4} />
      <Skeleton className={cn("mt-4 h-9 w-full rounded-full")} />
    </SurfaceSection>
  );
}
