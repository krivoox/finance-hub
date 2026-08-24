"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format-money";
import type { BudgetWithProgress } from "@/features/budgets/services";

import { UnarchiveBudgetButton } from "./archive-budget-dialog";
import { BudgetCategoryPills } from "./budget-category-pills";
import { BUDGET_PERIOD_LABEL_ES } from "./period-labels";

type ArchivedBudgetRowProps = {
  budget: BudgetWithProgress;
  canMutate: boolean;
  categoryNameById: Readonly<Record<string, string>>;
};

/**
 * Archived budget in the list: muted identity + visible restore CTA.
 * Whole-row tap goes to detail; Desarchivar is a separate control (z-10).
 */
export function ArchivedBudgetRow({
  budget,
  canMutate,
  categoryNameById,
}: ArchivedBudgetRowProps) {
  return (
    <li className="relative flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/budgets/${budget.id}`}
            className="font-medium text-foreground after:absolute after:inset-0 hover:underline"
          >
            {budget.name}
          </Link>
          <Badge variant="secondary">
            {BUDGET_PERIOD_LABEL_ES[budget.period]}
          </Badge>
        </div>
        <BudgetCategoryPills
          className="mt-1.5"
          categoryIds={budget.categoryIds}
          categoryNameById={categoryNameById}
        />
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          Límite {formatMoney(budget.limitCents, budget.currency)}
        </p>
      </div>

      <div className="relative z-10 flex w-full shrink-0 items-center gap-2 sm:w-auto">
        {canMutate ? (
          <UnarchiveBudgetButton
            budgetId={budget.id}
            className="flex-1 sm:flex-none"
          />
        ) : null}
        <Button variant="ghost" size="sm" className="shrink-0" asChild>
          <Link href={`/budgets/${budget.id}`}>
            Ver
            <ChevronRight className="size-4" strokeWidth={1.75} />
          </Link>
        </Button>
      </div>
    </li>
  );
}
