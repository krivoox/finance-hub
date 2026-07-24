import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/kpi-tile";
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
 * Ordered KPI row (reference dashboard) with Finance Hub metrics:
 * Patrimonio (emphasis) · Flujo neto · Ingresos · Gastos
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
    ? "income"
    : netNegative
      ? "expense"
      : "default";

  const showBreakdown = balancesByCurrency.length > 1;
  const heroBalance = consolidated ?? balance;
  const showApprox = Boolean(consolidated);

  const tcCaption =
    fxRate && consolidated
      ? `TC ${fxRate.label}: 1 ${fxRate.quoteCurrency} ≈ ${rateScaledToArsPerUsd(fxRate.rateScaled, fxRate.scale).toLocaleString("es-AR", { maximumFractionDigits: 2 })} ${heroBalance.currency}`
      : null;

  return (
    <section aria-label="Resumen financiero" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          emphasis
          label="Patrimonio"
          value={
            <>
              {showApprox ? "≈ " : null}
              {formatMoney(heroBalance.amountCents, heroBalance.currency)}
            </>
          }
          hint={tcCaption ?? periodLabel}
          className="sm:col-span-2 xl:col-span-1"
        >
          {showBreakdown ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {balancesByCurrency.map((row) => (
                <li key={row.currency}>
                  <Badge
                    variant={row.currency === "USD" ? "secondary" : "outline"}
                    className="h-5 border-primary-foreground/25 bg-primary-foreground/10 px-1.5 text-[10px] text-primary-foreground"
                  >
                    {row.currency}{" "}
                    <span className="ml-1 tabular-nums opacity-90">
                      {formatMoney(row.amountCents, row.currency)}
                    </span>
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </KpiTile>

        <KpiTile
          label="Flujo del mes"
          tone={netTone}
          value={formatSignedMoney(cashflow.netCents, cashflow.currency)}
          hint={periodLabel}
        />

        <KpiTile
          label="Ingresos"
          tone="income"
          value={formatMoney(cashflow.incomeCents, cashflow.currency)}
          hint={cashflow.currency}
        />

        <KpiTile
          label="Gastos"
          tone="expense"
          value={formatMoney(cashflow.expenseCents, cashflow.currency)}
          hint={cashflow.currency}
        />
      </div>
    </section>
  );
}
