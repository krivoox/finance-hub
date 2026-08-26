"use client";

import { formatMoney } from "@/lib/format-money";
import { splitLeadingEmoji } from "@/features/categories/domain/split-leading-emoji";
import {
  buildCategoryShares,
  OTHER_CATEGORY_ID,
  type SpendingByCategoryRow,
} from "@/features/dashboard/domain";
import { cn } from "@/lib/utils";

type MobileCategorySpendingCardProps = {
  currency: string;
  yearMonth: string;
  rows: readonly SpendingByCategoryRow[];
  previousRows: readonly SpendingByCategoryRow[];
};

const SLICE_STROKE = [
  "stroke-chart-1",
  "stroke-chart-2",
  "stroke-chart-3",
  "stroke-chart-4",
  "stroke-chart-5",
] as const;
const SLICE_FILL = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;
const SLICE_DOT = SLICE_FILL;

const RADIUS = 15.915;
const STROKE_WIDTH = 3.75;

const longMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function monthDate(yearMonth: string): Date {
  const [year, month] = yearMonth.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

function sliceTone(categoryId: string, index: number) {
  if (categoryId === OTHER_CATEGORY_ID) {
    return {
      stroke: "stroke-muted-foreground/50",
      fill: "bg-muted-foreground/50",
      dot: "bg-muted-foreground/50",
    };
  }
  return {
    stroke: SLICE_STROKE[index % SLICE_STROKE.length]!,
    fill: SLICE_FILL[index % SLICE_FILL.length]!,
    dot: SLICE_DOT[index % SLICE_DOT.length]!,
  };
}

type DonutArc = { length: number; offset: number };

function toDonutArcs(
  slices: readonly { amountCents: number }[],
  totalCents: number,
): DonutArc[] {
  const arcs: DonutArc[] = [];
  let cursor = 0;
  for (const slice of slices) {
    const length = totalCents > 0 ? (slice.amountCents / totalCents) * 100 : 0;
    arcs.push({ length, offset: -cursor });
    cursor += length;
  }
  return arcs;
}

function previousCentsFor(
  categoryId: string,
  previousRows: readonly SpendingByCategoryRow[],
): number {
  return previousRows.find((row) => row.categoryId === categoryId)?.amountCents ?? 0;
}

function movCountFor(
  categoryId: string,
  rows: readonly SpendingByCategoryRow[],
  otherIds: ReadonlySet<string>,
): number {
  if (categoryId === OTHER_CATEGORY_ID) {
    return rows
      .filter((row) => !otherIds.has(row.categoryId))
      .reduce((sum, row) => sum + (row.transactionCount ?? 0), 0);
  }
  return rows.find((row) => row.categoryId === categoryId)?.transactionCount ?? 0;
}

function movLabel(count: number): string {
  if (count === 1) return "1 mov.";
  return `${count} mov.`;
}

/**
 * Mobile spending-by-category card: donut + ranking bars + list.
 * Amounts come from domain aggregates (expenses only).
 */
export function MobileCategorySpendingCard({
  currency,
  yearMonth,
  rows,
  previousRows,
}: MobileCategorySpendingCardProps) {
  const { slices, totalCents } = buildCategoryShares(rows);
  const arcs = toDonutArcs(slices, totalCents);
  const keptIds = new Set(
    slices
      .filter((slice) => slice.categoryId !== OTHER_CATEGORY_ID)
      .map((slice) => slice.categoryId),
  );
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
          <div className="relative mx-auto size-44">
            <svg viewBox="0 0 42 42" className="size-full -rotate-90" aria-hidden>
              <circle
                cx="21"
                cy="21"
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE_WIDTH}
                className="stroke-border"
              />
              {slices.map((slice, index) => {
                const arc = arcs[index]!;
                return (
                  <circle
                    key={slice.categoryId}
                    cx="21"
                    cy="21"
                    r={RADIUS}
                    fill="none"
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={`${arc.length} ${100 - arc.length}`}
                    strokeDashoffset={arc.offset}
                    className={sliceTone(slice.categoryId, index).stroke}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-[22%] flex flex-col items-center justify-center gap-0.5 text-center">
              <p className="text-[11px] leading-none text-muted-foreground">
                Gastado
              </p>
              <p className="max-w-full text-base font-semibold leading-tight tracking-tight tabular-nums text-foreground">
                {formatMoney(totalCents, currency)}
              </p>
            </div>
          </div>

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
                const tone = sliceTone(slice.categoryId, index);
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
                      <span className="shrink-0 text-sm tabular-nums text-expense">
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
              <span className="text-sm font-semibold tabular-nums text-expense">
                {formatMoney(totalCents, currency)}
              </span>
            </div>
          </div>

            <ul className="flex flex-col gap-1 border-t border-border pt-3">
            {slices.map((slice) => {
              const { emoji, label } = splitLeadingEmoji(slice.categoryName);
              const count = movCountFor(slice.categoryId, rows, keptIds);

              return (
                <li
                  key={`row-${slice.categoryId}`}
                  className="flex items-center gap-3 py-2"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base"
                    aria-hidden
                  >
                    {emoji ?? "·"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">
                      {label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {slice.percent}% · {movLabel(count)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-expense">
                    {formatMoney(slice.amountCents, currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
