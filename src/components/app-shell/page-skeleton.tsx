import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PageSkeletonProps = {
  /** list = tablas/chips; detail = ficha; dashboard = bloques KPI */
  variant?: "list" | "detail" | "dashboard";
  className?: string;
};

/**
 * Route-level loading UI for `(app)` segments. Mirrors ContentPanel chrome so
 * soft-nav feels instant while the RSC payload streams in.
 */
export function PageSkeleton({
  variant = "list",
  className,
}: PageSkeletonProps) {
  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-[1400px] flex-1 flex-col md:min-h-0 md:overflow-hidden",
        className,
      )}
      aria-busy
      aria-label="Cargando"
    >
      <header className="flex shrink-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5 lg:px-8">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-40 sm:h-8 sm:w-52" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl sm:h-10 sm:w-40" />
      </header>

      <div className="flex-1 space-y-5 px-4 pb-4 sm:px-6 sm:pb-5 lg:px-8 lg:pb-6">
        {variant === "dashboard" ? (
          <>
            <Skeleton className="h-56 rounded-2xl" />
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          </>
        ) : null}

        {variant === "list" ? (
          <>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[28rem] rounded-2xl" />
          </>
        ) : null}

        {variant === "detail" ? (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-48" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-full max-w-xs" />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
