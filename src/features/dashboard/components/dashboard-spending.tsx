import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import type { SpendingByCategoryRow } from "@/features/dashboard/domain";
import { CategorySpendingDonut } from "./category-spending-donut";

type DashboardSpendingProps = {
  currency: string;
  rows: readonly SpendingByCategoryRow[];
};

/**
 * Distribución de gastos del mes (SPEC-11 / SPEC-12): donut + leyenda.
 */
export function DashboardSpending({ currency, rows }: DashboardSpendingProps) {
  return (
    <SurfaceSection className="flex h-full flex-col">
      <SurfaceHeader
        title="Distribución de gastos"
        description="Por categoría, este mes"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/transactions?type=expense">Ver gastos</Link>
          </Button>
        }
      />
      <CategorySpendingDonut
        currency={currency}
        rows={rows}
        emptyMessage="Sin gastos categorizados este mes."
      />
    </SurfaceSection>
  );
}
