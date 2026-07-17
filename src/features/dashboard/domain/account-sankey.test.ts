import { describe, expect, it } from "vitest";

import {
  aggregateSpendingFlows,
  buildAccountExpenseSankey,
} from "./account-sankey";
import type { AnalyticsTransaction } from "./analytics-types";

function tx(
  partial: Partial<AnalyticsTransaction> &
    Pick<AnalyticsTransaction, "type" | "amountCents">,
): AnalyticsTransaction {
  return {
    categoryId: partial.categoryId ?? null,
    categoryName: partial.categoryName ?? null,
    accountId: partial.accountId ?? null,
    accountName: partial.accountName ?? null,
    occurredOn: partial.occurredOn ?? new Date(Date.UTC(2026, 6, 1)),
    ...partial,
  };
}

describe("aggregateSpendingFlows", () => {
  it("aggregates expense flows by account and category", () => {
    const flows = aggregateSpendingFlows([
      tx({
        type: "expense",
        amountCents: 40,
        accountId: "cash",
        accountName: "Efectivo",
        categoryId: "food",
        categoryName: "Comida",
      }),
      tx({
        type: "expense",
        amountCents: 10,
        accountId: "cash",
        accountName: "Efectivo",
        categoryId: "food",
        categoryName: "Comida",
      }),
      tx({
        type: "expense",
        amountCents: 20,
        accountId: "bank",
        accountName: "Banco",
        categoryId: "transport",
        categoryName: "Transporte",
      }),
      tx({ type: "income", amountCents: 999, accountId: "bank", accountName: "Banco" }),
      tx({ type: "transfer", amountCents: 50, accountId: "cash", accountName: "Efectivo" }),
    ]);

    expect(flows).toEqual([
      {
        accountId: "cash",
        accountName: "Efectivo",
        categoryId: "food",
        categoryName: "Comida",
        amountCents: 50,
      },
      {
        accountId: "bank",
        accountName: "Banco",
        categoryId: "transport",
        categoryName: "Transporte",
        amountCents: 20,
      },
    ]);
  });

  it("uses placeholders when account or category is missing", () => {
    const flows = aggregateSpendingFlows([
      tx({
        type: "expense",
        amountCents: 15,
        accountId: null,
        categoryId: null,
      }),
    ]);

    expect(flows).toEqual([
      {
        accountId: "_unknown",
        accountName: "Sin cuenta",
        categoryId: "_uncategorized",
        categoryName: "Sin categoría",
        amountCents: 15,
      },
    ]);
  });
});

describe("buildAccountExpenseSankey", () => {
  it("returns empty when there are no expense flows", () => {
    expect(buildAccountExpenseSankey({ flows: [] })).toEqual({
      nodes: [],
      links: [],
    });
  });

  it("links accounts to expense categories without a hub", () => {
    const result = buildAccountExpenseSankey({
      flows: [
        {
          accountId: "cash",
          accountName: "Efectivo",
          categoryId: "food",
          categoryName: "Comida",
          amountCents: 30,
        },
        {
          accountId: "cash",
          accountName: "Efectivo",
          categoryId: "transport",
          categoryName: "Transporte",
          amountCents: 20,
        },
        {
          accountId: "bank",
          accountName: "Banco",
          categoryId: "food",
          categoryName: "Comida",
          amountCents: 50,
        },
      ],
    });

    expect(result.nodes.map((n) => n.id)).toEqual([
      "account:cash",
      "account:bank",
      "expense:food",
      "expense:transport",
    ]);
    expect(result.nodes.find((n) => n.id === "account:cash")).toMatchObject({
      kind: "account",
      amountCents: 50,
    });
    expect(result.nodes.find((n) => n.id === "expense:food")).toMatchObject({
      kind: "expense",
      amountCents: 80,
    });
    expect(result.links).toEqual([
      {
        sourceId: "account:bank",
        targetId: "expense:food",
        amountCents: 50,
      },
      {
        sourceId: "account:cash",
        targetId: "expense:food",
        amountCents: 30,
      },
      {
        sourceId: "account:cash",
        targetId: "expense:transport",
        amountCents: 20,
      },
    ]);
  });

  it("groups overflow accounts and categories into Otros", () => {
    const result = buildAccountExpenseSankey({
      maxAccounts: 1,
      maxCategories: 1,
      flows: [
        {
          accountId: "a",
          accountName: "A",
          categoryId: "c1",
          categoryName: "C1",
          amountCents: 100,
        },
        {
          accountId: "b",
          accountName: "B",
          categoryId: "c2",
          categoryName: "C2",
          amountCents: 40,
        },
      ],
    });

    expect(result.nodes.map((n) => n.id)).toEqual([
      "account:a",
      "account:other",
      "expense:c1",
      "expense:other",
    ]);
    expect(result.links).toContainEqual({
      sourceId: "account:other",
      targetId: "expense:other",
      amountCents: 40,
    });
  });
});
