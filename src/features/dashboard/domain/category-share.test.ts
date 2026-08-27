import { describe, expect, it } from "vitest";

import {
  buildCategoryShares,
  hiddenCategoryRows,
  OTHER_CATEGORY_ID,
  rankedSpendingRows,
} from "./category-share";
import type { SpendingByCategoryRow } from "./analytics-types";

function row(
  categoryId: string,
  categoryName: string,
  amountCents: number,
): SpendingByCategoryRow {
  return { categoryId, categoryName, amountCents };
}

describe("buildCategoryShares (SPEC-11 / SPEC-12 — distribución por categoría)", () => {
  it("returns shares sorted desc with percentages of the total", () => {
    const result = buildCategoryShares([
      row("comida", "Comida", 30_000),
      row("transporte", "Transporte", 10_000),
    ]);

    expect(result.totalCents).toBe(40_000);
    expect(result.slices).toEqual([
      {
        categoryId: "comida",
        categoryName: "Comida",
        amountCents: 30_000,
        percent: 75,
      },
      {
        categoryId: "transporte",
        categoryName: "Transporte",
        amountCents: 10_000,
        percent: 25,
      },
    ]);
  });

  it("groups the tail beyond the limit into a single 'Otras' slice", () => {
    const result = buildCategoryShares(
      [
        row("a", "A", 50_000),
        row("b", "B", 30_000),
        row("c", "C", 10_000),
        row("d", "D", 8_000),
        row("e", "E", 2_000),
      ],
      { limit: 3 },
    );

    expect(result.slices).toHaveLength(4);
    expect(result.slices.at(-1)).toEqual({
      categoryId: OTHER_CATEGORY_ID,
      categoryName: "Otras",
      amountCents: 10_000,
      percent: 10,
    });
  });

  it("does not group when the tail is a single category", () => {
    const result = buildCategoryShares(
      [row("a", "A", 50_000), row("b", "B", 30_000), row("c", "C", 20_000)],
      { limit: 2 },
    );

    expect(result.slices.map((s) => s.categoryId)).toEqual(["a", "b", "c"]);
  });

  it("ignores rows without amount", () => {
    const result = buildCategoryShares([
      row("a", "A", 10_000),
      row("b", "B", 0),
    ]);

    expect(result.slices.map((s) => s.categoryId)).toEqual(["a"]);
    expect(result.totalCents).toBe(10_000);
  });

  it("returns an empty distribution when there is no spending", () => {
    const result = buildCategoryShares([]);

    expect(result.slices).toEqual([]);
    expect(result.totalCents).toBe(0);
  });

  it("sorts desc and rounds percentages to one decimal", () => {
    const result = buildCategoryShares([row("a", "A", 1), row("b", "B", 2)]);

    expect(result.slices.map((s) => s.categoryId)).toEqual(["b", "a"]);
    expect(result.slices.map((s) => s.percent)).toEqual([66.7, 33.3]);
  });
});

describe("hiddenCategoryRows", () => {
  it("returns the real tail folded into Otras, ranked desc", () => {
    const rows = [
      row("a", "A", 50_000),
      row("b", "B", 30_000),
      row("c", "C", 10_000),
      row("d", "D", 8_000),
      row("e", "E", 2_000),
    ];
    const { slices } = buildCategoryShares(rows, { limit: 3 });

    expect(hiddenCategoryRows(rows, slices)).toEqual([
      row("d", "D", 8_000),
      row("e", "E", 2_000),
    ]);
    const otras = slices.find((s) => s.categoryId === OTHER_CATEGORY_ID);
    expect(otras?.amountCents).toBe(10_000);
  });

  it("returns empty when Otras was not created", () => {
    const rows = [row("a", "A", 50_000), row("b", "B", 30_000), row("c", "C", 20_000)];
    const { slices } = buildCategoryShares(rows, { limit: 2 });

    expect(hiddenCategoryRows(rows, slices)).toEqual([]);
  });

  it("ignores zero-amount rows in the tail", () => {
    const rows = [
      row("a", "A", 50_000),
      row("b", "B", 30_000),
      row("c", "C", 10_000),
      row("d", "D", 8_000),
      row("e", "E", 0),
    ];
    const { slices } = buildCategoryShares(rows, { limit: 2 });

    expect(hiddenCategoryRows(rows, slices).map((r) => r.categoryId)).toEqual([
      "c",
      "d",
    ]);
  });
});

describe("rankedSpendingRows", () => {
  it("keeps only positive amounts and sorts desc", () => {
    expect(
      rankedSpendingRows([
        row("a", "A", 1_000),
        row("b", "B", 0),
        row("c", "C", 5_000),
      ]).map((r) => r.categoryId),
    ).toEqual(["c", "a"]);
  });
});
