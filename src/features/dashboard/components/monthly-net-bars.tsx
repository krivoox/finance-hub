"use client";

import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney, formatSignedMoney } from "@/lib/format-money";
import type { NetTrendPoint } from "@/features/dashboard/domain";
import { cn } from "@/lib/utils";

export type ChartMode = "balance" | "income" | "expense";

const CHART_MODE_LABEL: Record<ChartMode, string> = {
  balance: "Balance",
  income: "Ingresos",
  expense: "Gastos",
};

const CHART_MODES: readonly ChartMode[] = ["balance", "income", "expense"];

type MonthlyNetBarsProps = {
  points: readonly NetTrendPoint[];
  maxAbsNetCents: number;
  maxIncomeCents: number;
  maxExpenseCents: number;
  currency: string;
};

/** "2026-08" → Date at UTC midnight of the 1st, for month labels only. */
function monthDate(yearMonth: string): Date {
  const [year, month] = yearMonth.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  timeZone: "UTC",
});
const longMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function valueForMode(point: NetTrendPoint, mode: ChartMode): number {
  if (mode === "income") return point.incomeCents;
  if (mode === "expense") return point.expenseCents;
  return point.netCents;
}

function formatValue(cents: number, mode: ChartMode, currency: string): string {
  if (mode === "balance") return formatSignedMoney(cents, currency);
  return formatMoney(cents, currency);
}

/**
 * Monthly series chart with Balance / Ingresos / Gastos modes and hover
 * tooltips. Presentation only — values come from `buildNetTrend`.
 */
export function MonthlyNetBars({
  points,
  maxAbsNetCents,
  maxIncomeCents,
  maxExpenseCents,
  currency,
}: MonthlyNetBarsProps) {
  const tooltipId = useId();
  const [mode, setMode] = useState<ChartMode>("balance");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (points.length === 0) return null;

  const lastIndex = points.length - 1;
  const scale =
    mode === "balance"
      ? Math.max(maxAbsNetCents, 1)
      : mode === "income"
        ? Math.max(maxIncomeCents, 1)
        : Math.max(maxExpenseCents, 1);

  const activeIndex = hoveredIndex ?? lastIndex;
  const activePoint = points[activeIndex];
  const activeValue = valueForMode(activePoint, mode);

  return (
    <figure className="mt-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
              aria-label={`Serie del gráfico: ${CHART_MODE_LABEL[mode]}`}
            >
              {CHART_MODE_LABEL[mode]}
              <ChevronDown className="size-3.5 opacity-70" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-36">
            {CHART_MODES.map((option) => (
              <DropdownMenuItem
                key={option}
                onSelect={() => setMode(option)}
                className="justify-between gap-3"
              >
                {CHART_MODE_LABEL[option]}
                {option === mode ? (
                  <Check className="size-3.5" strokeWidth={2} aria-hidden />
                ) : (
                  <span className="size-3.5" aria-hidden />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            mode === "income" || (mode === "balance" && activeValue > 0)
              ? "text-income"
              : mode === "expense" || (mode === "balance" && activeValue < 0)
                ? "text-expense"
                : "text-foreground",
          )}
          aria-live="polite"
        >
          {formatValue(activeValue, mode, currency)}
        </p>
      </div>

      <div
        className={cn(
          "relative flex items-stretch gap-1 sm:gap-1.5",
          mode === "balance" ? "h-28 sm:h-36" : "h-28 items-end sm:h-36",
        )}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {mode === "balance" ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border"
          />
        ) : null}

        {points.map((point, index) => {
          const date = monthDate(point.yearMonth);
          const value = valueForMode(point, mode);
          const height = (Math.abs(value) / scale) * 100;
          const isCurrent = index === lastIndex;
          const isHovered = hoveredIndex === index;
          const label = longMonthFormatter.format(date);
          const formatted = formatValue(value, mode, currency);
          const positive = value > 0;
          const negative = value < 0;

          return (
            <button
              key={point.yearMonth}
              type="button"
              className="group relative flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label={`${label}: ${formatted}`}
              aria-describedby={isHovered ? tooltipId : undefined}
              onMouseEnter={() => setHoveredIndex(index)}
              onFocus={() => setHoveredIndex(index)}
              onBlur={() => setHoveredIndex(null)}
            >
              {mode === "balance" ? (
                <>
                  <div className="flex basis-1/2 items-end">
                    {positive ? (
                      <Candle
                        tone="income"
                        heightPct={height}
                        emphasized={isCurrent || isHovered}
                        active={isHovered}
                      />
                    ) : null}
                  </div>
                  <div className="flex basis-1/2 items-start">
                    {negative ? (
                      <Candle
                        tone="expense"
                        heightPct={height}
                        emphasized={isCurrent || isHovered}
                        active={isHovered}
                        flip
                      />
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-end">
                  <Candle
                    tone={mode === "income" ? "income" : "expense"}
                    heightPct={value === 0 ? 0 : height}
                    emphasized={isCurrent || isHovered}
                    active={isHovered}
                  />
                </div>
              )}

              {isHovered ? (
                <span
                  id={tooltipId}
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
                >
                  <span className="block font-medium capitalize">{label}</span>
                  <span
                    className={cn(
                      "mt-0.5 block tabular-nums",
                      mode === "income" || (mode === "balance" && value > 0)
                        ? "text-income"
                        : mode === "expense" ||
                            (mode === "balance" && value < 0)
                          ? "text-expense"
                          : "text-foreground",
                    )}
                  >
                    {formatted}
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1 sm:gap-1.5">
        {points.map((point, index) => (
          <span
            key={point.yearMonth}
            className={cn(
              "flex-1 truncate text-center text-[10px] capitalize sm:text-xs",
              hoveredIndex === index ||
                (hoveredIndex === null && index === lastIndex)
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {monthFormatter.format(monthDate(point.yearMonth)).replace(".", "")}
          </span>
        ))}
      </div>

      <figcaption className="sr-only">
        {CHART_MODE_LABEL[mode]} mensual de los últimos {points.length} meses.
        Pasá el cursor o el foco sobre una vela para ver el valor.
      </figcaption>
    </figure>
  );
}

function Candle({
  tone,
  heightPct,
  emphasized,
  active,
  flip = false,
}: {
  tone: "income" | "expense";
  heightPct: number;
  emphasized: boolean;
  active: boolean;
  flip?: boolean;
}) {
  const fill =
    tone === "income"
      ? active
        ? "bg-income"
        : emphasized
          ? "bg-income/55 ring-1 ring-income/70 ring-inset"
          : "bg-income/80"
      : active
        ? "bg-expense"
        : emphasized
          ? "bg-expense/55 ring-1 ring-expense/70 ring-inset"
          : "bg-expense/80";

  return (
    <div
      className={cn(
        "w-full transition-[height,opacity,background-color] duration-150",
        flip ? "rounded-b-sm" : "rounded-t-sm",
        fill,
        active ? "opacity-100" : "group-hover:opacity-100",
      )}
      style={{ height: `${Math.max(heightPct, heightPct === 0 ? 0 : 2)}%` }}
    />
  );
}
