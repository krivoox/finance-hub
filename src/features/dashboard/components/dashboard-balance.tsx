import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/kpi-tile";
import { SurfaceSection } from "@/components/surface-section";
import { formatMoney, formatSignedMoney } from "@/lib/format-money";
import type {
  MonthlyCashflow,
  NetTrend,
  TotalBalance,
} from "@/features/dashboard/domain";
import { rateScaledToArsPerUsd } from "@/features/dashboard/domain";

import { MonthlyNetBars } from "./monthly-net-bars";

type FxRateCaption = {
  label: string;
  rateScaled: number;
  scale: number;
  quoteCurrency: string;
};

type DashboardBalanceProps = {
  balance: TotalBalance;
  balancesByCurrency?: TotalBalance[];
  consolidated?: TotalBalance;
  fxRate?: FxRateCaption;
  cashflow: MonthlyCashflow;
  netTrend: NetTrend;
  periodLabel: string;
};

const percentFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "always",
});

/**
 * Hero del Panel (SPEC-12): patrimonio + flujo neto mensual.
 * El número grande es el patrimonio; la tendencia y el delta describen el
 * flujo del mes — nunca se mezclan en una sola lectura.
 */
export function DashboardBalance({
  balance,
  balancesByCurrency = [],
  consolidated,
  fxRate,
  cashflow,
  netTrend,
  periodLabel,
}: DashboardBalanceProps) {
  const heroBalance = consolidated ?? balance;
  const showApprox = Boolean(consolidated);
  const showBreakdown = balancesByCurrency.length > 1;

  const tcCaption =
    fxRate && consolidated
      ? `TC ${fxRate.label}: 1 ${fxRate.quoteCurrency} ≈ ${rateScaledToArsPerUsd(
          fxRate.rateScaled,
          fxRate.scale,
        ).toLocaleString("es-AR", { maximumFractionDigits: 2 })} ${heroBalance.currency}`
      : null;

  const variation = netTrend.variationPercent;
  const variationPositive = variation !== null && variation > 0;
  const variationNegative = variation !== null && variation < 0;

  const netTone =
    cashflow.netCents > 0
      ? "income"
      : cashflow.netCents < 0
        ? "expense"
        : "default";

  return (
    <SurfaceSection aria-label="Patrimonio y flujo del mes" className="h-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Patrimonio
          </h2>
          <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums text-foreground sm:text-4xl">
            {showApprox ? "≈ " : null}
            {formatMoney(heroBalance.amountCents, heroBalance.currency)}
          </p>
          {tcCaption ? (
            <p className="mt-1.5 text-xs text-muted-foreground">{tcCaption}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground dark:bg-background/40">
          {periodLabel}
        </span>
      </div>

      {showBreakdown ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {balancesByCurrency.map((row) => (
            <li key={row.currency}>
              <Badge variant="outline" className="h-6 gap-1 px-2 text-[11px]">
                {row.currency}
                <span className="tabular-nums text-muted-foreground">
                  {formatMoney(row.amountCents, row.currency)}
                </span>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {variation !== null ? (
        <div className="mt-4 flex justify-end border-t border-border pt-3 sm:mt-5 sm:pt-4">
          <Badge
            variant={
              variationPositive
                ? "income"
                : variationNegative
                  ? "expense"
                  : "outline"
            }
            className="gap-1 tabular-nums"
          >
            {variationPositive ? (
              <TrendingUp className="size-3.5" aria-hidden />
            ) : variationNegative ? (
              <TrendingDown className="size-3.5" aria-hidden />
            ) : null}
            {percentFormatter.format(variation)}%
            <span className="font-normal opacity-80">flujo vs. mes anterior</span>
          </Badge>
        </div>
      ) : (
        <div className="mt-4 border-t border-border sm:mt-5" />
      )}

      {/* Serie mensual: densa para desktop; en móvil el glance es la barra de gastos. */}
      <div className="hidden md:block">
        <MonthlyNetBars
          points={netTrend.points}
          maxAbsNetCents={netTrend.maxAbsNetCents}
          maxIncomeCents={netTrend.maxIncomeCents}
          maxExpenseCents={netTrend.maxExpenseCents}
          currency={cashflow.currency}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:mt-5 sm:grid-cols-3 sm:gap-4 sm:pt-4">
        <KpiTile
          variant="plain"
          size="sm"
          label="Ingresos"
          tone="income"
          value={formatMoney(cashflow.incomeCents, cashflow.currency)}
        />
        <KpiTile
          variant="plain"
          size="sm"
          label="Gastos"
          tone="expense"
          value={formatMoney(cashflow.expenseCents, cashflow.currency)}
        />
        <KpiTile
          variant="plain"
          size="sm"
          label="Flujo del mes"
          tone={netTone}
          value={formatSignedMoney(cashflow.netCents, cashflow.currency)}
          className="col-span-2 sm:col-span-1"
        />
      </div>
    </SurfaceSection>
  );
}
