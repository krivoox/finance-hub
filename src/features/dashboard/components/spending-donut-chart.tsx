import { formatFittedMoney } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { OTHER_CATEGORY_ID } from "@/features/dashboard/domain";

/** Paleta de charts (DESIGN.md §4). La cola agrupada usa gris neutro. */
export const DONUT_SLICE_STROKE = [
  "stroke-chart-1",
  "stroke-chart-2",
  "stroke-chart-3",
  "stroke-chart-4",
  "stroke-chart-5",
] as const;

export const DONUT_SLICE_FILL = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

export const DONUT_SLICE_DOT = DONUT_SLICE_FILL;

/** Radio con circunferencia ≈ 100 → dasharray se expresa en porcentaje. */
const RADIUS = 15.915;
/** Anillo un poco más fino → hoyo más amplio para montos largos. */
const STROKE_WIDTH = 3.25;

export function donutSliceTone(categoryId: string, index: number) {
  if (categoryId === OTHER_CATEGORY_ID) {
    return {
      stroke: "stroke-muted-foreground/50",
      fill: "bg-muted-foreground/50",
      dot: "bg-muted-foreground/50",
    };
  }
  return {
    stroke: DONUT_SLICE_STROKE[index % DONUT_SLICE_STROKE.length]!,
    fill: DONUT_SLICE_FILL[index % DONUT_SLICE_FILL.length]!,
    dot: DONUT_SLICE_DOT[index % DONUT_SLICE_DOT.length]!,
  };
}

type DonutArc = { length: number; offset: number };

export function toDonutArcs(
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

function donutAmountClass(label: string): string {
  if (label.length >= 16) return "text-[10px] sm:text-xs";
  if (label.length >= 13) return "text-xs sm:text-sm";
  return "text-sm sm:text-base";
}

type SpendingDonutChartProps = {
  currency: string;
  totalCents: number;
  slices: readonly { categoryId: string; amountCents: number }[];
  caption: string;
  captionPosition?: "above" | "below";
  className?: string;
};

/**
 * Donut de gastos por categoría. El anillo escala al ancho de la card; el
 * total del hoyo usa notación compacta y un cuerpo menor si el monto no cabe
 * (KRI-34).
 */
export function SpendingDonutChart({
  currency,
  totalCents,
  slices,
  caption,
  captionPosition = "above",
  className,
}: SpendingDonutChartProps) {
  const arcs = toDonutArcs(slices, totalCents);
  const amountLabel = formatFittedMoney(totalCents, currency, { maxChars: 14 });

  const captionEl = (
    <p className="text-[11px] leading-none text-muted-foreground">{caption}</p>
  );
  const amountEl = (
    <p
      className={cn(
        "max-w-full font-semibold leading-tight tracking-tight break-words tabular-nums text-foreground",
        donutAmountClass(amountLabel),
      )}
    >
      {amountLabel}
    </p>
  );

  return (
    <div
      className={cn(
        "@container relative mx-auto aspect-square w-[min(100%,15rem)] shrink-0 sm:mx-0",
        className,
      )}
    >
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
              className={donutSliceTone(slice.categoryId, index).stroke}
            />
          );
        })}
      </svg>
      <div className="absolute inset-[14%] flex flex-col items-center justify-center gap-0.5 px-1 text-center">
        {captionPosition === "above" ? captionEl : null}
        {amountEl}
        {captionPosition === "below" ? captionEl : null}
      </div>
    </div>
  );
}
