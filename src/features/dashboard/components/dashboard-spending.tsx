import Link from "next/link";

import {
  ProgressBar,
  spendingRankTone,
} from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { formatMoney } from "@/lib/format-money";
import type { SpendingByCategoryRow } from "@/features/dashboard/domain";

type DashboardSpendingProps = {
  currency: string;
  rows: readonly SpendingByCategoryRow[];
};

export function DashboardSpending({ currency, rows }: DashboardSpendingProps) {
  const top = rows.slice(0, 5);
  const max = top[0]?.amountCents ?? 0;

  return (
    <SurfaceSection className="h-full">
      <SurfaceHeader
        title="Gastos del mes"
        description="Top categorías"
        action={
          <Button variant="ghost" size="sm" className="h-8 rounded-full" asChild>
            <Link href="/transactions">Ver movimientos</Link>
          </Button>
        }
      />

      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin gastos categorizados este mes.
        </p>
      ) : (
        <ul className="space-y-3">
          {top.map((row, index) => {
            const width =
              max > 0 ? Math.max(4, (row.amountCents / max) * 100) : 0;

            return (
              <li key={row.categoryId} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-foreground">
                    {row.categoryName}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMoney(row.amountCents, currency)}
                  </span>
                </div>
                <ProgressBar
                  value={width}
                  tone={spendingRankTone(index)}
                  size="sm"
                  aria-label={`${row.categoryName}: ${formatMoney(row.amountCents, currency)}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </SurfaceSection>
  );
}
