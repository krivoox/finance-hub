import {
  SPLIT_UNCATEGORIZED_CATEGORY_ID,
  SPLIT_UNCATEGORIZED_CATEGORY_NAME,
  type SplitCategorySpendingRow,
  type SplitExpenseForCategory,
} from "./types";

/**
 * SPEC-09 H7b / SPEC-10 T-24 — Sum split expenses by the expense category.
 * Settlements are not part of the input. Amounts are integer cents.
 */
export function aggregateSplitSpendingByCategory(
  expenses: readonly SplitExpenseForCategory[],
): SplitCategorySpendingRow[] {
  const map = new Map<string, SplitCategorySpendingRow>();

  for (const expense of expenses) {
    if (expense.amountCents <= 0) continue;

    const categoryId = expense.categoryId ?? SPLIT_UNCATEGORIZED_CATEGORY_ID;
    const categoryName =
      expense.categoryName?.trim() ||
      (expense.categoryId ? expense.categoryId : SPLIT_UNCATEGORIZED_CATEGORY_NAME);
    const existing = map.get(categoryId);
    if (existing) {
      existing.amountCents += expense.amountCents;
      existing.transactionCount += 1;
    } else {
      map.set(categoryId, {
        categoryId,
        categoryName,
        amountCents: expense.amountCents,
        transactionCount: 1,
      });
    }
  }

  return [...map.values()].toSorted((a, b) => b.amountCents - a.amountCents);
}
