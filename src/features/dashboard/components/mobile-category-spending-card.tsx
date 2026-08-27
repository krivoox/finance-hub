"use client";

import { formatMoney } from "@/lib/format-money";
import { splitLeadingEmoji } from "@/features/categories/domain/split-leading-emoji";
import {
  buildCategoryShares,
  type SpendingByCategoryRow,
} from "@/features/dashboard/domain";
import { cn } from "@/lib/utils";

import { CategorySpendingAllList } from "./category-spending-all-list";
import { donutSliceTone, SpendingDonutChart } from "./spending-donut-chart";

type MobileCategorySpendingCardProps = {
  currency: string;
  yearMonth: string;
  rows: readonly SpendingByCategoryRow[];
  previousRows: readonly SpendingByCategoryRow[];
};

const longMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function monthDate(yearMonth: string): Date {
  const [year, month] = yearMonth.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

function previousCentsFor(
  categoryId: string,
  previousRows: readonly SpendingByCategoryRow[],
): number {
  return previousRows.find((row) => row.categoryId === categoryId)?.amountCents ?? 0;
}

/**
 * Mobile spending-by-category card: donut + ranking bars + list.
 * Amounts come from domain aggregates (expenses only — KRI-34).
 */
export function MobileCategorySpendingCard({
  currency,
  yearMonth,
  rows,
  previousRows,
}: MobileCategorySpendingCardProps) {
  const { slices, totalCents } = buildCategoryShares(rows);
  const monthLabel = longMonthFormatter.format(monthDate(yearMonth));
  const hasPrevious = previousRows.some((row) => row.amountCents > 0);

  return (
    <section aria-label={`Gastos por categoría · ${monthLabel}`}>
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Gastos por categoría
      </h2>

      {slices.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground text-pretty">
          Sin gastos este mes. Las transferencias entre cuentas no cuentan.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          <SpendingDonutChart
            currency={currency}
            totalCents={totalCents}
            slices={slices}
            caption="Gastado"
            captionPosition="above"
            className="sm:mx-auto"
          />

          <p className="text-center text-[11px] text-muted-foreground text-pretty">
            {hasPrevious
              ? "La barra tenue de atrás es el período anterior"
              : "Sin registro del período anterior"}
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">
                En qué gastaste más
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Solo gastos reales · {monthLabel}
              </p>
            </div>

            <ul className="flex flex-col gap-3.5">
              {slices.map((slice, index) => {
                const tone = donutSliceTone(slice.categoryId, index);
                const previousCents = previousCentsFor(
                  slice.categoryId,
                  previousRows,
                );
                const currentPct =
                  totalCents > 0 ? (slice.amountCents / totalCents) * 100 : 0;
                const previousPct =
                  totalCents > 0 ? (previousCents / totalCents) * 100 : 0;
                const { emoji, label } = splitLeadingEmoji(slice.categoryName);

                return (
                  <li key={slice.categoryId} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn("size-2 shrink-0 rounded-full", tone.dot)}
                          aria-hidden
                        />
                        <span className="truncate text-sm text-foreground">
                          {emoji ? `${emoji} ${label}` : label}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-sm text-expense">
                        {formatMoney(slice.amountCents, currency)}
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                      {previousPct > 0 ? (
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/25"
                          style={{ width: `${Math.min(previousPct, 100)}%` }}
                          aria-hidden
                        />
                      ) : null}
                      <span
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full",
                          tone.fill,
                        )}
                        style={{ width: `${Math.min(currentPct, 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {slice.percent}% del total
                      {previousCents > 0
                        ? ` · ant. ${formatMoney(previousCents, currency)}`
                        : " · sin registro anterior"}
                    </p>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="tabular text-sm font-semibold text-expense">
                {formatMoney(totalCents, currency)}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <CategorySpendingAllList
              currency={currency}
              rows={rows}
              slices={slices}
              variant="replace"
            />
          </div>
        </div>
      )}
    </section>
  );
}
