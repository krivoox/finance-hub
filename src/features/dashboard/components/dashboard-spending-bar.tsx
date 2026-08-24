import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { formatMoney } from "@/lib/format-money";
import {
  buildCategoryShares,
  OTHER_CATEGORY_ID,
  type SpendingByCategoryRow,
} from "@/features/dashboard/domain";
import { cn } from "@/lib/utils";

type DashboardSpendingBarProps = {
  currency: string;
  rows: readonly SpendingByCategoryRow[];
  /** Max legend rows (mobile-first glance). */
  limit?: number;
};

const SLICE_FILL = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

function sliceFill(categoryId: string, index: number) {
  if (categoryId === OTHER_CATEGORY_ID) {
    return "bg-muted-foreground/40";
  }
  return SLICE_FILL[index % SLICE_FILL.length]!;
}

/**
 * Compact spending glance for mobile Panel — segmented bar + short legend.
 * Shares come from `buildCategoryShares` (domain); no new metrics.
 */
export function DashboardSpendingBar({
  currency,
  rows,
  limit = 3,
}: DashboardSpendingBarProps) {
  const { slices, totalCents } = buildCategoryShares(rows, { limit });

  if (slices.length === 0) {
    return null;
  }

  return (
    <SurfaceSection
      aria-label="Gastos del mes por categoría"
      className="md:hidden"
    >
      <SurfaceHeader
        title="Gastos del mes"
        description={formatMoney(totalCents, currency)}
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/transactions?type=expense">Ver todo</Link>
          </Button>
        }
      />

      <div
        className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full bg-border"
        role="img"
        aria-label="Distribución de gastos"
      >
        {slices.map((slice, index) => {
          const width =
            totalCents > 0 ? (slice.amountCents / totalCents) * 100 : 0;
          if (width <= 0) return null;
          return (
            <span
              key={slice.categoryId}
              className={cn("h-full min-w-0.5", sliceFill(slice.categoryId, index))}
              style={{ width: `${width}%` }}
              title={`${slice.categoryName}: ${slice.percent}%`}
            />
          );
        })}
      </div>

      <ul className="mt-3 space-y-2">
        {slices.map((slice, index) => (
          <li
            key={slice.categoryId}
            className="flex items-center gap-2.5 text-sm"
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                sliceFill(slice.categoryId, index),
              )}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-foreground">
              {slice.categoryName}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {slice.percent}%
            </span>
          </li>
        ))}
      </ul>
    </SurfaceSection>
  );
}
