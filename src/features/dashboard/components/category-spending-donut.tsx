import {
  buildCategoryShares,
  type SpendingByCategoryRow,
} from "@/features/dashboard/domain";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format-money";

import { CategorySpendingAllList } from "./category-spending-all-list";
import {
  donutSliceTone,
  SpendingDonutChart,
} from "./spending-donut-chart";

type CategorySpendingDonutProps = {
  currency: string;
  rows: readonly SpendingByCategoryRow[];
  emptyMessage: string;
};

/**
 * Donut + leyenda de gastos por categoría (SPEC-11 / SPEC-12).
 * Los porcentajes vienen de `buildCategoryShares` (dominio testeado).
 */
export function CategorySpendingDonut({
  currency,
  rows,
  emptyMessage,
}: CategorySpendingDonutProps) {
  const { slices, totalCents } = buildCategoryShares(rows);

  if (slices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-pretty">{emptyMessage}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-5">
        <SpendingDonutChart
          currency={currency}
          totalCents={totalCents}
          slices={slices}
          caption="Total gastos"
          captionPosition="below"
        />

        <ul className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-[13.5rem]">
          {slices.map((slice, index) => (
            <li
              key={slice.categoryId}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2 text-sm"
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 self-start rounded-full",
                  donutSliceTone(slice.categoryId, index).dot,
                )}
                aria-hidden
              />
              <span className="min-w-0 truncate text-foreground">
                {slice.categoryName}
              </span>
              <span className="flex shrink-0 items-baseline gap-1.5 text-muted-foreground">
                <span className="tabular text-xs sm:text-sm">
                  {formatMoney(slice.amountCents, currency)}
                </span>
                <span className="tabular w-8 text-right text-xs">
                  {slice.percent}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <CategorySpendingAllList
        currency={currency}
        rows={rows}
        slices={slices}
      />
    </div>
  );
}
