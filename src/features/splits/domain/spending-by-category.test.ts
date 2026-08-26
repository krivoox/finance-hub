import { describe, expect, it } from "vitest";

import {
  aggregateSplitSpendingByCategory,
  SPLIT_UNCATEGORIZED_CATEGORY_ID,
  SPLIT_UNCATEGORIZED_CATEGORY_NAME,
  type SplitExpenseForCategory,
} from "./index";

function expense(
  partial: Partial<SplitExpenseForCategory> & Pick<SplitExpenseForCategory, "amountCents">,
): SplitExpenseForCategory {
  return {
    categoryId: "categoryId" in partial ? (partial.categoryId ?? null) : "comida",
    categoryName: "categoryName" in partial ? (partial.categoryName ?? null) : "Comida",
    amountCents: partial.amountCents,
  };
}

describe("aggregateSplitSpendingByCategory (SPEC-09 H7b / SPEC-10 T-24)", () => {
  it("sums split expenses by categoryId, sorted desc", () => {
    const rows = aggregateSplitSpendingByCategory([
      expense({ categoryId: "transporte", categoryName: "Transporte", amountCents: 4_000 }),
      expense({ categoryId: "comida", categoryName: "Comida", amountCents: 6_000 }),
    ]);

    expect(rows).toEqual([
      {
        categoryId: "comida",
        categoryName: "Comida",
        amountCents: 6_000,
        transactionCount: 1,
      },
      {
        categoryId: "transporte",
        categoryName: "Transporte",
        amountCents: 4_000,
        transactionCount: 1,
      },
    ]);
    expect(rows.reduce((sum, row) => sum + row.amountCents, 0)).toBe(10_000);
  });

  it("folds splits of the same category into one row", () => {
    const rows = aggregateSplitSpendingByCategory([
      expense({ amountCents: 3_000 }),
      expense({ amountCents: 2_000 }),
    ]);

    expect(rows).toEqual([
      {
        categoryId: "comida",
        categoryName: "Comida",
        amountCents: 5_000,
        transactionCount: 2,
      },
    ]);
  });

  it("folds uncategorized expenses into Sin categoría", () => {
    const rows = aggregateSplitSpendingByCategory([
      expense({ categoryId: null, categoryName: null, amountCents: 1_500 }),
      expense({ categoryId: "comida", categoryName: "Comida", amountCents: 500 }),
    ]);

    expect(rows).toEqual([
      {
        categoryId: SPLIT_UNCATEGORIZED_CATEGORY_ID,
        categoryName: SPLIT_UNCATEGORIZED_CATEGORY_NAME,
        amountCents: 1_500,
        transactionCount: 1,
      },
      {
        categoryId: "comida",
        categoryName: "Comida",
        amountCents: 500,
        transactionCount: 1,
      },
    ]);
  });

  it("uses categoryId as name fallback when the label is blank", () => {
    const rows = aggregateSplitSpendingByCategory([
      expense({ categoryId: "cat-x", categoryName: "  ", amountCents: 100 }),
    ]);

    expect(rows[0]).toMatchObject({
      categoryId: "cat-x",
      categoryName: "cat-x",
      amountCents: 100,
    });
  });

  it("does not merge categories from different tenants that share a name", () => {
    const rows = aggregateSplitSpendingByCategory([
      expense({
        categoryId: "ws-ana-comida",
        categoryName: "Comida",
        amountCents: 3_000,
      }),
      expense({
        categoryId: "ws-bob-comida",
        categoryName: "Comida",
        amountCents: 2_000,
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.categoryId).toSorted()).toEqual([
      "ws-ana-comida",
      "ws-bob-comida",
    ]);
    expect(rows.reduce((sum, row) => sum + row.amountCents, 0)).toBe(5_000);
  });

  it("returns an empty list when there are no split expenses", () => {
    expect(aggregateSplitSpendingByCategory([])).toEqual([]);
  });

  it("ignores non-positive amounts", () => {
    const rows = aggregateSplitSpendingByCategory([
      expense({ amountCents: 0 }),
      expense({ amountCents: -10 }),
      expense({ amountCents: 800 }),
    ]);

    expect(rows).toEqual([
      {
        categoryId: "comida",
        categoryName: "Comida",
        amountCents: 800,
        transactionCount: 1,
      },
    ]);
  });
});
