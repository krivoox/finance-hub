import { describe, expect, it } from "vitest";
import {
  aggregateSpendingByCategory,
  buildMonthlySeries,
  computeInsights,
  summarizeCashflow,
} from "./analytics";
import type { AnalyticsTransaction } from "./analytics-types";

function tx(
  partial: Partial<AnalyticsTransaction> &
    Pick<AnalyticsTransaction, "type" | "amountCents">,
): AnalyticsTransaction {
  return {
    categoryId: partial.categoryId ?? null,
    categoryName: partial.categoryName ?? null,
    occurredOn: partial.occurredOn ?? new Date(Date.UTC(2026, 6, 1)),
    ...partial,
  };
}

describe("aggregateSpendingByCategory (SPEC-11 T-01 / T-02)", () => {
  it("maps expenses by category and totals 150", () => {
    const rows = aggregateSpendingByCategory([
      tx({
        type: "expense",
        amountCents: 100,
        categoryId: "comida",
        categoryName: "Comida",
      }),
      tx({
        type: "expense",
        amountCents: 50,
        categoryId: "transporte",
        categoryName: "Transporte",
      }),
      tx({ type: "transfer", amountCents: 999, categoryId: null }),
      tx({
        type: "income",
        amountCents: 200,
        categoryId: "salario",
        categoryName: "Salario",
      }),
    ]);
    expect(rows).toEqual([
      { categoryId: "comida", categoryName: "Comida", amountCents: 100 },
      {
        categoryId: "transporte",
        categoryName: "Transporte",
        amountCents: 50,
      },
    ]);
    expect(rows.reduce((s, r) => s + r.amountCents, 0)).toBe(150);
  });
});

describe("summarizeCashflow", () => {
  it("excludes transfers", () => {
    expect(
      summarizeCashflow([
        tx({ type: "income", amountCents: 100 }),
        tx({ type: "expense", amountCents: 40 }),
        tx({ type: "transfer", amountCents: 999 }),
      ]),
    ).toEqual({ incomeCents: 100, expenseCents: 40, netCents: 60 });
  });
});

describe("buildMonthlySeries", () => {
  it("aggregates last N months", () => {
    const series = buildMonthlySeries(
      [
        tx({
          type: "expense",
          amountCents: 10,
          occurredOn: new Date(Date.UTC(2026, 5, 15)),
        }),
        tx({
          type: "income",
          amountCents: 50,
          occurredOn: new Date(Date.UTC(2026, 6, 2)),
        }),
      ],
      2,
      new Date(Date.UTC(2026, 6, 10)),
    );
    expect(series).toEqual([
      { yearMonth: "2026-06", incomeCents: 0, expenseCents: 10 },
      { yearMonth: "2026-07", incomeCents: 50, expenseCents: 0 },
    ]);
  });
});

describe("computeInsights (SPEC-11 T-03 / T-04)", () => {
  it("emits top_category and variation +20%", () => {
    const insights = computeInsights({
      currentSpending: [
        { categoryId: "comida", categoryName: "Comida", amountCents: 120 },
      ],
      previousSpending: [
        { categoryId: "comida", categoryName: "Comida", amountCents: 100 },
      ],
      budgetsExceededCount: 2,
    });
    expect(insights).toContainEqual({
      kind: "top_category",
      categoryId: "comida",
      categoryName: "Comida",
      amountCents: 120,
    });
    expect(insights).toContainEqual({
      kind: "category_variation",
      categoryId: "comida",
      categoryName: "Comida",
      previousCents: 100,
      currentCents: 120,
      variationPercent: 20,
    });
    expect(insights).toContainEqual({
      kind: "budgets_exceeded",
      count: 2,
    });
  });
});
