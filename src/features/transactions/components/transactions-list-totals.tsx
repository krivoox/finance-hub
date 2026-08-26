import { KpiTile } from "@/components/kpi-tile";
import { SurfaceSection } from "@/components/surface-section";
import { formatMoney, formatSignedMoney } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import {
  presentListTotals,
  type CurrencyListTotals,
  type ListTypeFilter,
  type PresentedListTotals,
} from "@/features/transactions/domain";

type TransactionsListTotalsProps = {
  buckets: readonly CurrencyListTotals[];
  typeFilter: ListTypeFilter;
  className?: string;
};

type TotalsCell = {
  key: string;
  label: string;
  value: string;
  tone: "income" | "expense" | "transfer";
};

function cellsFromPresented(presented: PresentedListTotals): TotalsCell[] {
  if (presented.mode === "breakdown") {
    return presented.byCurrency.flatMap((row) => {
      const cells: TotalsCell[] = [];
      if (row.expenseCents > 0) {
        cells.push({
          key: `${row.currency}-expense`,
          label: `Gastos ${row.currency}`,
          value: formatSignedMoney(-row.expenseCents, row.currency),
          tone: "expense",
        });
      }
      if (row.incomeCents > 0) {
        cells.push({
          key: `${row.currency}-income`,
          label: `Ingresos ${row.currency}`,
          value: formatSignedMoney(row.incomeCents, row.currency),
          tone: "income",
        });
      }
      return cells;
    });
  }

  const tone: TotalsCell["tone"] =
    presented.mode === "income"
      ? "income"
      : presented.mode === "expense"
        ? "expense"
        : "transfer";
  const prefix =
    presented.mode === "income"
      ? "Ingresos"
      : presented.mode === "expense"
        ? "Gastos"
        : "Transferencias";

  return presented.lines.map((line) => ({
    key: line.currency,
    label: `${prefix} ${line.currency}`,
    value:
      presented.mode === "income"
        ? formatSignedMoney(line.amountCents, line.currency)
        : presented.mode === "expense"
          ? formatSignedMoney(-line.amountCents, line.currency)
          : formatMoney(line.amountCents, line.currency),
    tone,
  }));
}

function hasPresentableTotals(presented: PresentedListTotals): boolean {
  if (presented.mode === "breakdown") {
    return presented.byCurrency.length > 0;
  }
  return presented.lines.length > 0;
}

export function TransactionsListTotals({
  buckets,
  typeFilter,
  className,
}: TransactionsListTotalsProps) {
  const presented = presentListTotals(buckets, typeFilter);
  if (!hasPresentableTotals(presented)) return null;

  const totalCount = buckets.reduce((n, b) => n + b.count, 0);
  const cells = cellsFromPresented(presented);
  const countLabel =
    totalCount === 1 ? "1 movimiento" : `${totalCount} movimientos`;

  return (
    <SurfaceSection
      className={cn("py-4 md:py-5", className)}
      role="status"
      aria-label={`Totales del listado filtrado · ${countLabel}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Totales · {countLabel}
      </p>
      <div
        className={cn(
          "mt-4 grid gap-4",
          cells.length >= 4
            ? "grid-cols-2 md:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
        )}
      >
        {cells.map((cell) => (
          <KpiTile
            key={cell.key}
            variant="plain"
            size="sm"
            label={cell.label}
            tone={cell.tone}
            value={cell.value}
          />
        ))}
      </div>
    </SurfaceSection>
  );
}

/** True when the totals card would render something meaningful. */
export function hasListTotalsToShow(
  buckets: readonly CurrencyListTotals[],
  typeFilter: ListTypeFilter,
): boolean {
  return hasPresentableTotals(presentListTotals(buckets, typeFilter));
}
