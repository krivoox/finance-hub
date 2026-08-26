import { describe, expect, it } from "vitest";
import {
  aggregateSpendingByCategory,
  aggregateSpendingByCategoryByMonth,
  buildMonthlySeries,
  computeInsights,
  summarizeCashflow,
} from "./analytics";
import {
  UNCATEGORIZED_CATEGORY_ID,
  UNCATEGORIZED_CATEGORY_NAME,
  type AnalyticsTransaction,
} from "./analytics-types";

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
      {
        categoryId: "comida",
        categoryName: "Comida",
        amountCents: 100,
        transactionCount: 1,
      },
      {
        categoryId: "transporte",
        categoryName: "Transporte",
        amountCents: 50,
        transactionCount: 1,
      },
    ]);
    expect(rows.reduce((s, r) => s + r.amountCents, 0)).toBe(150);
  });

  it("T-02: excludes transfers and fx legs from spending", () => {
    const rows = aggregateSpendingByCategory([
      tx({
        type: "expense",
        amountCents: 40,
        categoryId: "comida",
        categoryName: "Comida",
      }),
      tx({ type: "transfer", amountCents: 999, categoryId: "comida" }),
      tx({ type: "fx_debit", amountCents: 500, categoryId: "comida" }),
      tx({ type: "fx_credit", amountCents: 500, categoryId: "comida" }),
    ]);
    expect(rows).toEqual([
      {
        categoryId: "comida",
        categoryName: "Comida",
        amountCents: 40,
        transactionCount: 1,
      },
    ]);
  });

  it("folds uncategorized expenses into Sin categoría so totals match cashflow", () => {
    const rows = aggregateSpendingByCategory([
      tx({
        type: "expense",
        amountCents: 80,
        categoryId: "comida",
        categoryName: "Comida",
      }),
      tx({ type: "expense", amountCents: 20, categoryId: null }),
    ]);
    expect(rows).toEqual([
      {
        categoryId: "comida",
        categoryName: "Comida",
        amountCents: 80,
        transactionCount: 1,
      },
      {
        categoryId: UNCATEGORIZED_CATEGORY_ID,
        categoryName: UNCATEGORIZED_CATEGORY_NAME,
        amountCents: 20,
        transactionCount: 1,
      },
    ]);
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

  it("excludes fx debit/credit from income and expense", () => {
    expect(
      summarizeCashflow([
        tx({ type: "expense", amountCents: 40 }),
        tx({ type: "fx_debit", amountCents: 200 }),
        tx({ type: "fx_credit", amountCents: 180 }),
      ]),
    ).toEqual({ incomeCents: 0, expenseCents: 40, netCents: -40 });
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

  it("does not add transfers or fx legs to monthly expenses", () => {
    const series = buildMonthlySeries(
      [
        tx({
          type: "expense",
          amountCents: 30,
          occurredOn: new Date(Date.UTC(2026, 6, 2)),
        }),
        tx({
          type: "transfer",
          amountCents: 900,
          occurredOn: new Date(Date.UTC(2026, 6, 3)),
        }),
        tx({
          type: "fx_debit",
          amountCents: 200,
          occurredOn: new Date(Date.UTC(2026, 6, 4)),
        }),
      ],
      1,
      new Date(Date.UTC(2026, 6, 10)),
    );
    expect(series).toEqual([
      { yearMonth: "2026-07", incomeCents: 0, expenseCents: 30 },
    ]);
  });
});

describe("aggregateSpendingByCategoryByMonth", () => {
  it("buckets expenses by YYYY-MM and ignores transfers", () => {
    const byMonth = aggregateSpendingByCategoryByMonth(
      [
        tx({
          type: "expense",
          amountCents: 10,
          categoryId: "comida",
          categoryName: "Comida",
          occurredOn: new Date(Date.UTC(2026, 5, 10)),
        }),
        tx({
          type: "expense",
          amountCents: 25,
          categoryId: "comida",
          categoryName: "Comida",
          occurredOn: new Date(Date.UTC(2026, 6, 2)),
        }),
        tx({
          type: "transfer",
          amountCents: 99,
          categoryId: "comida",
          categoryName: "Comida",
          occurredOn: new Date(Date.UTC(2026, 6, 3)),
        }),
      ],
      ["2026-06", "2026-07"],
    );

    expect(byMonth["2026-06"]?.[0]?.amountCents).toBe(10);
    expect(byMonth["2026-07"]?.[0]?.amountCents).toBe(25);
    expect(byMonth["2026-07"]?.[0]?.transactionCount).toBe(1);
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
