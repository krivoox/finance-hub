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

type DashboardSpendingProps = {
  currency: string;
  rows: readonly SpendingByCategoryRow[];
};

/** Paleta de charts (DESIGN.md §4). La cola agrupada usa gris neutro. */
const SLICE_STROKE = [
  "stroke-chart-1",
  "stroke-chart-2",
  "stroke-chart-3",
  "stroke-chart-4",
  "stroke-chart-5",
] as const;
const SLICE_DOT = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

/** Radio con circunferencia ≈ 100 → dasharray se expresa en porcentaje. */
const RADIUS = 15.915;
/** Anillo fino → hoyo más amplio para el total centrado. */
const STROKE_WIDTH = 3.75;

function sliceTone(categoryId: string, index: number) {
  if (categoryId === OTHER_CATEGORY_ID) {
    return { stroke: "stroke-muted-foreground/50", dot: "bg-muted-foreground/50" };
  }
  return {
    stroke: SLICE_STROKE[index % SLICE_STROKE.length]!,
    dot: SLICE_DOT[index % SLICE_DOT.length]!,
  };
}

type DonutArc = { length: number; offset: number };

/**
 * Arcos acumulados del donut: longitud y desplazamiento en % de la
 * circunferencia (r elegido para que la circunferencia sea ≈ 100).
 */
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

/**
 * Distribución de gastos del mes (SPEC-11 / SPEC-12): donut + leyenda.
 * Los porcentajes vienen de `buildCategoryShares` (dominio testeado).
 */
export function DashboardSpending({ currency, rows }: DashboardSpendingProps) {
  const { slices, totalCents } = buildCategoryShares(rows);
  const arcs = toDonutArcs(slices, totalCents);

  return (
    <SurfaceSection className="flex h-full flex-col">
      <SurfaceHeader
        title="Distribución de gastos"
        description="Por categoría, este mes"
        action={
          <Button variant="ghost" size="sm" className="h-8 rounded-full" asChild>
            <Link href="/transactions?type=expense">Ver gastos</Link>
          </Button>
        }
      />

      {slices.length === 0 ? (
        <p className="text-sm text-muted-foreground text-pretty">
          Sin gastos categorizados este mes.
        </p>
      ) : (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative mx-auto size-40 shrink-0 sm:mx-0 sm:size-48 sm:flex-[1.2]">
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
              <p className="max-w-full text-sm font-semibold leading-tight tracking-tight tabular-nums text-foreground">
                {formatMoney(totalCents, currency)}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                Total gastos
              </p>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-2 sm:max-w-[13.5rem]">
            {slices.map((slice, index) => (
              <li
                key={slice.categoryId}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2 text-sm"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 self-start rounded-full",
                    sliceTone(slice.categoryId, index).dot,
                  )}
                  aria-hidden
                />
                <span className="min-w-0 truncate text-foreground">
                  {slice.categoryName}
                </span>
                <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums text-muted-foreground">
                  <span className="text-xs sm:text-sm">
                    {formatMoney(slice.amountCents, currency)}
                  </span>
                  <span className="w-8 text-right text-xs tabular-nums">
                    {slice.percent}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SurfaceSection>
  );
}
