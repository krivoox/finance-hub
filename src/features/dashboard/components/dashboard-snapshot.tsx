import { Badge } from "@/components/ui/badge";
import { formatMoney, formatSignedMoney } from "@/lib/format-money";
import type { MonthlyCashflow, TotalBalance } from "@/features/dashboard/domain";
import { rateScaledToArsPerUsd } from "@/features/dashboard/domain";

type FxRateCaption = {
  label: string;
  rateScaled: number;
  scale: number;
  quoteCurrency: string;
};

type DashboardSnapshotProps = {
  balance: TotalBalance;
  balancesByCurrency?: TotalBalance[];
  consolidated?: TotalBalance;
  fxRate?: FxRateCaption;
  cashflow: MonthlyCashflow;
  periodLabel: string;
};

/**
 * Hero of the dashboard: one composition.
 * Patrimonio leads; multi-currency breakdown when present; cashflow supports.
 */
export function DashboardSnapshot({
  balance,
  balancesByCurrency = [],
  consolidated,
  fxRate,
  cashflow,
  periodLabel,
}: DashboardSnapshotProps) {
  const netPositive = cashflow.netCents > 0;
  const netNegative = cashflow.netCents < 0;
  const netTone = netPositive
    ? "text-income"
    : netNegative
      ? "text-expense"
      : "text-foreground";
  const netSurface = netPositive
    ? "bg-income-muted/70"
    : netNegative
      ? "bg-expense-muted/70"
      : "bg-muted/70";

  const showBreakdown = balancesByCurrency.length > 1;
  const heroBalance = consolidated ?? balance;
  const showApprox = Boolean(consolidated);

  const tcCaption =
    fxRate && consolidated
      ? `TC ${fxRate.label}: 1 ${fxRate.quoteCurrency} ≈ ${rateScaledToArsPerUsd(fxRate.rateScaled, fxRate.scale).toLocaleString("es-AR", { maximumFractionDigits: 2 })} ${heroBalance.currency}`
      : null;

  return (
    <section aria-label="Resumen financiero" className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Patrimonio
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-balance text-foreground tabular-nums sm:text-4xl">
          {showApprox ? "≈ " : null}
          {formatMoney(heroBalance.amountCents, heroBalance.currency)}
        </p>
        {tcCaption ? (
          <p className="mt-1 text-xs text-muted-foreground">{tcCaption}</p>
        ) : null}
        {showBreakdown ? (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {balancesByCurrency.map((row) => (
              <li key={row.currency} className="flex items-center gap-1.5">
                <Badge
                  variant={row.currency === "USD" ? "info" : "outline"}
                  className="h-5 px-1.5 text-xs"
                >
                  {row.currency}
                </Badge>
                <span className="tabular-nums text-foreground">
                  {formatMoney(row.amountCents, row.currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-3 border-t border-border pt-6 sm:grid-cols-[minmax(0,1.3fr)_1fr_1fr] sm:gap-4">
        <div className={`rounded-xl px-4 py-3 ${netSurface}`}>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Flujo del mes
          </p>
          <p
            className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${netTone}`}
          >
            {formatSignedMoney(cashflow.netCents, cashflow.currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground capitalize">
            {periodLabel}
            {showBreakdown ? ` · ${cashflow.currency}` : ""}
          </p>
        </div>

        <div className="rounded-xl bg-income-muted/60 px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Ingresos
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums text-income">
            {formatMoney(cashflow.incomeCents, cashflow.currency)}
          </p>
        </div>

        <div className="rounded-xl bg-expense-muted/60 px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Gastos
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums text-expense">
            {formatMoney(cashflow.expenseCents, cashflow.currency)}
          </p>
        </div>
      </div>
    </section>
  );
}
