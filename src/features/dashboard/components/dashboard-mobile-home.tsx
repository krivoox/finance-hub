"use client";

import { useState } from "react";

import { SurfaceSection } from "@/components/surface-section";
import type {
  MonthlySeriesPoint,
  SpendingByCategoryRow,
} from "@/features/dashboard/domain";

import { MobileCategorySpendingCard } from "./mobile-category-spending-card";
import { MobileMonthlyExpenseBars } from "./mobile-monthly-expense-bars";

type DashboardMobileHomeProps = {
  currency: string;
  monthlySeries: readonly MonthlySeriesPoint[];
  monthlyCategorySpending: Record<string, readonly SpendingByCategoryRow[]>;
};

function previousYearMonth(yearMonth: string): string | null {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return null;
  const d = new Date(Date.UTC(year, month - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Mobile Panel home: monthly expense bars + category donut.
 * Desktop keeps the existing dense composition.
 */
export function DashboardMobileHome({
  currency,
  monthlySeries,
  monthlyCategorySpending,
}: DashboardMobileHomeProps) {
  const lastMonth = monthlySeries.at(-1)?.yearMonth ?? "";
  const [selectedYearMonth, setSelectedYearMonth] = useState(lastMonth);

  const yearMonth =
    monthlySeries.some((p) => p.yearMonth === selectedYearMonth)
      ? selectedYearMonth
      : lastMonth;

  const rows = monthlyCategorySpending[yearMonth] ?? [];
  const prevKey = previousYearMonth(yearMonth);
  const previousRows = prevKey ? (monthlyCategorySpending[prevKey] ?? []) : [];

  return (
    <div className="flex flex-col gap-5">
      <SurfaceSection>
        <MobileMonthlyExpenseBars
          points={monthlySeries}
          selectedYearMonth={yearMonth}
          onSelect={setSelectedYearMonth}
        />
      </SurfaceSection>
      <SurfaceSection>
        <MobileCategorySpendingCard
          currency={currency}
          yearMonth={yearMonth}
          rows={rows}
          previousRows={previousRows}
        />
      </SurfaceSection>
    </div>
  );
}
