"use client";

import {
  ArchiveBudgetDialog,
  UnarchiveBudgetButton,
} from "./archive-budget-dialog";
import { EditBudgetSheet } from "./edit-budget-sheet";

type CategoryOption = {
  id: string;
  name: string;
};

type BudgetDetailActionsProps = {
  budgetId: string;
  name: string;
  limitCents: number;
  currency: string;
  categoryIds: readonly string[];
  categories: readonly CategoryOption[];
  isArchived: boolean;
};

/**
 * Mutation CTAs for budget detail. Parent gates on `canMutate` (viewer → omit).
 */
export function BudgetDetailActions({
  budgetId,
  name,
  limitCents,
  currency,
  categoryIds,
  categories,
  isArchived,
}: BudgetDetailActionsProps) {
  return (
    <>
      <EditBudgetSheet
        budgetId={budgetId}
        name={name}
        limitCents={limitCents}
        currency={currency}
        categoryIds={categoryIds}
        categories={categories}
      />
      {isArchived ? (
        <UnarchiveBudgetButton budgetId={budgetId} />
      ) : (
        <ArchiveBudgetDialog budgetId={budgetId} budgetName={name} />
      )}
    </>
  );
}
