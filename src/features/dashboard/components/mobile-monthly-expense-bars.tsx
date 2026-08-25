"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";
import type { MonthlySeriesPoint } from "@/features/dashboard/domain";

type MobileMonthlyExpenseBarsProps = {
  points: readonly MonthlySeriesPoint[];
  selectedYearMonth: string;
  onSelect: (yearMonth: string) => void;
};

const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  timeZone: "UTC",
});
const longMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function monthDate(yearMonth: string): Date {
  const [year, month] = yearMonth.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

function formatBarAmount(cents: number): string {
  if (cents <= 0) return "0";
  const units = cents / 100;
  return new Intl.NumberFormat("es-AR", {
    notation: units >= 10_000 ? "compact" : "standard",
    compactDisplay: "short",
    maximumFractionDigits: units >= 10_000 ? 1 : 0,
  }).format(units);
}

/**
 * Mobile-only monthly expense bars. Values are cashflow expenses
 * (transfers / fx excluded) from `buildMonthlySeries`.
 */
export function MobileMonthlyExpenseBars({
  points,
  selectedYearMonth,
  onSelect,
}: MobileMonthlyExpenseBarsProps) {
  const headingId = useId();

  if (points.length === 0) return null;

  const maxExpense = Math.max(1, ...points.map((p) => p.expenseCents));

  return (
    <figure aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        Gastos por mes
      </h2>
      <div className="mt-3 flex items-stretch gap-1">
        {points.map((point) => {
          const date = monthDate(point.yearMonth);
          const selected = point.yearMonth === selectedYearMonth;
          const height =
            point.expenseCents <= 0
              ? 4
              : Math.max(8, (point.expenseCents / maxExpense) * 100);
          const label = longMonthFormatter.format(date);
          const short = monthFormatter.format(date).replace(".", "");

          return (
            <button
              key={point.yearMonth}
              type="button"
              onClick={() => onSelect(point.yearMonth)}
              aria-pressed={selected}
              aria-label={`${label}: ${formatBarAmount(point.expenseCents)}`}
              className="group flex min-w-0 flex-1 flex-col items-center outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span
                className={cn(
                  "mb-1 max-w-full truncate text-[9px] leading-none tabular-nums",
                  selected ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {formatBarAmount(point.expenseCents)}
              </span>
              <span className="flex h-28 w-full items-end justify-center">
                <span
                  className={cn(
                    "w-full max-w-9 rounded-t-md transition-[height,background-color] duration-200",
                    selected ? "bg-cta" : "bg-muted-foreground/25 group-hover:bg-muted-foreground/40",
                  )}
                  style={{ height: `${height}%` }}
                />
              </span>
              <span
                className={cn(
                  "mt-1.5 max-w-full truncate text-[10px] capitalize leading-none",
                  selected ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {short}
              </span>
            </button>
          );
        })}
      </div>
      <figcaption className="sr-only">
        Gasto mensual de los últimos {points.length} meses. Las transferencias
        entre cuentas no suman. Tocá un mes para ver las categorías.
      </figcaption>
    </figure>
  );
}
