import { formatMoney, formatSignedMoney } from "@/lib/format-money";
import type { MonthlyCashflow, TotalBalance } from "@/features/dashboard/domain";

type DashboardSnapshotProps = {
  balance: TotalBalance;
  cashflow: MonthlyCashflow;
  periodLabel: string;
};

/**
 * Hero of the dashboard: one composition.
 * Patrimonio leads; net cashflow tells the month story; income/expense support.
 */
export function DashboardSnapshot({
  balance,
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

  return (
    <section aria-label="Resumen financiero" className="space-y-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Patrimonio
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground text-balance sm:text-4xl">
          {formatMoney(balance.amountCents, balance.currency)}
        </p>
      </div>

      <div className="grid gap-6 border-t border-border pt-6 sm:grid-cols-[minmax(0,1.2fr)_1fr_1fr]">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Flujo del mes
          </p>
          <p className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${netTone}`}>
            {formatSignedMoney(cashflow.netCents, cashflow.currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground capitalize">
            {periodLabel}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Ingresos
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums text-income">
            {formatMoney(cashflow.incomeCents, cashflow.currency)}
          </p>
        </div>

        <div>
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
