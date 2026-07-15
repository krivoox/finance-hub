import Link from "next/link";

import {
  ProgressBar,
  spendingRankTone,
} from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
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
    <section aria-label="Gastos por categoría" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            Gastos del mes
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Top categorías
          </p>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" asChild>
          <Link href="/transactions">Ver movimientos</Link>
        </Button>
      </div>

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
    </section>
  );
}
