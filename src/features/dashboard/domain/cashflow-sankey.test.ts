import { describe, expect, it } from "vitest";

import { buildCashflowSankey } from "./cashflow-sankey";

describe("buildCashflowSankey", () => {
  it("returns empty when there is no cashflow", () => {
    expect(
      buildCashflowSankey({
        incomeCents: 0,
        expenseCents: 0,
        spendingByCategory: [],
      }),
    ).toEqual({ nodes: [], links: [] });
  });

  it("routes income through hub into top categories and surplus", () => {
    const result = buildCashflowSankey({
      incomeCents: 100_000,
      expenseCents: 40_000,
      spendingByCategory: [
        { categoryId: "food", categoryName: "Comida", amountCents: 25_000 },
        {
          categoryId: "transport",
          categoryName: "Transporte",
          amountCents: 15_000,
        },
      ],
    });

    expect(result.nodes.map((n) => n.id)).toEqual([
      "income",
      "hub",
      "expense:food",
      "expense:transport",
      "surplus",
    ]);

    expect(result.links).toEqual([
      { sourceId: "income", targetId: "hub", amountCents: 100_000 },
      { sourceId: "hub", targetId: "expense:food", amountCents: 25_000 },
      { sourceId: "hub", targetId: "expense:transport", amountCents: 15_000 },
      { sourceId: "hub", targetId: "surplus", amountCents: 60_000 },
    ]);

    expect(result.nodes.find((n) => n.id === "surplus")?.kind).toBe("surplus");
    expect(result.nodes.find((n) => n.id === "expense:food")?.kind).toBe(
      "expense",
    );
  });

  it("groups remaining categories into Otros and adds deficit when expenses exceed income", () => {
    const result = buildCashflowSankey({
      incomeCents: 50_000,
      expenseCents: 80_000,
      maxCategories: 2,
      spendingByCategory: [
        { categoryId: "a", categoryName: "A", amountCents: 40_000 },
        { categoryId: "b", categoryName: "B", amountCents: 30_000 },
        { categoryId: "c", categoryName: "C", amountCents: 10_000 },
      ],
    });

    expect(result.nodes.map((n) => n.id)).toEqual([
      "income",
      "deficit",
      "hub",
      "expense:a",
      "expense:b",
      "expense:other",
    ]);

    expect(result.links).toContainEqual({
      sourceId: "income",
      targetId: "hub",
      amountCents: 50_000,
    });
    expect(result.links).toContainEqual({
      sourceId: "deficit",
      targetId: "hub",
      amountCents: 30_000,
    });
    expect(result.links).toContainEqual({
      sourceId: "hub",
      targetId: "expense:other",
      amountCents: 10_000,
    });

    const hub = result.nodes.find((n) => n.id === "hub");
    expect(hub?.amountCents).toBe(80_000);
  });

  it("shows uncategorized expenses when categories do not cover the total", () => {
    const result = buildCashflowSankey({
      incomeCents: 100_000,
      expenseCents: 70_000,
      spendingByCategory: [
        { categoryId: "food", categoryName: "Comida", amountCents: 40_000 },
      ],
    });

    expect(result.links).toContainEqual({
      sourceId: "hub",
      targetId: "expense:uncategorized",
      amountCents: 30_000,
    });
  });
});
