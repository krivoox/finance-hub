import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { NetTrend } from "@/features/dashboard/domain";

import { MonthlyNetBars } from "./monthly-net-bars";

const percentFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "always",
});

type DashboardBalanceTrendProps = {
  netTrend: NetTrend;
  currency: string;
};

/** Variation badge + monthly bars (analytics-backed). */
export function DashboardBalanceTrend({
  netTrend,
  currency,
}: DashboardBalanceTrendProps) {
  const variation = netTrend.variationPercent;
  const variationPositive = variation !== null && variation > 0;
  const variationNegative = variation !== null && variation < 0;

  return (
    <>
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

      <div className="hidden md:block">
        <MonthlyNetBars
          points={netTrend.points}
          maxAbsNetCents={netTrend.maxAbsNetCents}
          maxIncomeCents={netTrend.maxIncomeCents}
          maxExpenseCents={netTrend.maxExpenseCents}
          currency={currency}
        />
      </div>
    </>
  );
}

export function DashboardBalanceTrendSkeleton() {
  return (
    <>
      <div className="mt-4 border-t border-border pt-3 sm:mt-5 sm:pt-4">
        <div className="flex justify-end">
          <Skeleton className="h-6 w-40 rounded-full" />
        </div>
      </div>
      <div className="mt-2 hidden md:block">
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    </>
  );
}
