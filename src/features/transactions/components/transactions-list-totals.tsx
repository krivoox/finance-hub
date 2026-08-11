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
  /** Compact strip under filters (sticky on mobile). */
  variant?: "strip" | "footer";
  className?: string;
};

function sumLabel(mode: PresentedListTotals["mode"]): string {
  switch (mode) {
    case "expense":
      return "Suma gastos";
    case "income":
      return "Suma ingresos";
    case "transfer":
      return "Suma transferencias";
    case "breakdown":
      return "Totales";
    default:
      return "Suma";
  }
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
  variant = "strip",
  className,
}: TransactionsListTotalsProps) {
  const presented = presentListTotals(buckets, typeFilter);
  if (!hasPresentableTotals(presented)) return null;

  const totalCount = buckets.reduce((n, b) => n + b.count, 0);
  const label = sumLabel(presented.mode);

  if (variant === "footer") {
    return (
      <div
        className={cn(
          "flex flex-col items-end gap-1 text-right",
          className,
        )}
      >
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {presented.mode === "breakdown" ? "Totales" : "Suma"}
        </span>
        <TotalsAmounts presented={presented} align="end" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 py-2.5",
        className,
      )}
      role="status"
      aria-label={`${label} del listado filtrado`}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {totalCount > 0 ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totalCount === 1
              ? "1 movimiento"
              : `${totalCount} movimientos`}
          </p>
        ) : null}
      </div>
      <TotalsAmounts presented={presented} align="end" />
    </div>
  );
}

/** True when the strip/footer would render something meaningful. */
export function hasListTotalsToShow(
  buckets: readonly CurrencyListTotals[],
  typeFilter: ListTypeFilter,
): boolean {
  return hasPresentableTotals(presentListTotals(buckets, typeFilter));
}

function TotalsAmounts({
  presented,
  align,
}: {
  presented: PresentedListTotals;
  align: "end" | "start";
}) {
  const alignClass = align === "end" ? "items-end text-right" : "items-start";

  if (presented.mode === "breakdown") {
    return (
      <div className={cn("flex flex-col gap-1", alignClass)}>
        {presented.byCurrency.map((row) => (
          <div key={row.currency} className="flex flex-col gap-0.5">
            {row.expenseCents > 0 ? (
              <span className="tabular-nums text-sm font-medium text-expense">
                {formatSignedMoney(-row.expenseCents, row.currency)}
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                  gastos
                </span>
              </span>
            ) : null}
            {row.incomeCents > 0 ? (
              <span className="tabular-nums text-sm font-medium text-income">
                {formatSignedMoney(row.incomeCents, row.currency)}
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                  ingresos
                </span>
              </span>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  const tone =
    presented.mode === "income"
      ? "text-income"
      : presented.mode === "expense"
        ? "text-expense"
        : "text-transfer";

  return (
    <div className={cn("flex flex-col gap-0.5", alignClass)}>
      {presented.lines.map((line) => (
        <span
          key={line.currency}
          className={cn("tabular-nums text-sm font-semibold", tone)}
        >
          {presented.mode === "income"
            ? formatSignedMoney(line.amountCents, line.currency)
            : presented.mode === "expense"
              ? formatSignedMoney(-line.amountCents, line.currency)
              : formatMoney(line.amountCents, line.currency)}
        </span>
      ))}
    </div>
  );
}
