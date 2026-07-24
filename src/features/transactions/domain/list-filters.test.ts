import { describe, expect, it } from "vitest";
import {
  matchesAccountFilter,
  matchesCategoryFilter,
  matchesTypeFilter,
  normalizeListTypeFilter,
  resolveListTypeFilter,
} from "./list-filters";
import type { TransactionLike } from "./types";

function tx(
  overrides: Partial<TransactionLike> & Pick<TransactionLike, "id" | "type">,
): TransactionLike {
  return {
    workspaceId: "ws-1",
    amountCents: 1_000,
    currency: "ARS",
    occurredOn: new Date("2026-07-10T00:00:00Z"),
    description: null,
    categoryId: null,
    accountId: "acc-a",
    counterpartyAccountId: null,
    createdByUserId: "u-1",
    createdAt: new Date("2026-07-10T12:00:00Z"),
    ...overrides,
  };
}

describe("resolveListTypeFilter — SPEC-05 T-16, T-19", () => {
  it("T-19: unknown / fx_debit URL values normalize to all (no predicate)", () => {
    expect(normalizeListTypeFilter("fx_debit")).toBe("all");
    expect(resolveListTypeFilter("fx_debit")).toBeUndefined();
    expect(resolveListTypeFilter("nope")).toBeUndefined();
    expect(resolveListTypeFilter(undefined)).toBeUndefined();
  });

  it("T-16: all includes income, transfer and fx; transfer excludes fx", () => {
    const income = tx({ id: "i", type: "income" });
    const transfer = tx({
      id: "t",
      type: "transfer",
      counterpartyAccountId: "acc-b",
    });
    const fx = tx({
      id: "fx",
      type: "fx_debit",
      counterpartyAccountId: "acc-b",
    });

    const allTypes = resolveListTypeFilter("all");
    expect(allTypes).toBeUndefined();
    expect(matchesTypeFilter(income, allTypes)).toBe(true);
    expect(matchesTypeFilter(transfer, allTypes)).toBe(true);
    expect(matchesTypeFilter(fx, allTypes)).toBe(true);

    const transferOnly = resolveListTypeFilter("transfer");
    expect(transferOnly).toEqual(["transfer"]);
    expect(matchesTypeFilter(income, transferOnly)).toBe(false);
    expect(matchesTypeFilter(transfer, transferOnly)).toBe(true);
    expect(matchesTypeFilter(fx, transferOnly)).toBe(false);

    const incomeOnly = resolveListTypeFilter("income");
    expect(incomeOnly).toEqual(["income"]);
    expect(matchesTypeFilter(income, incomeOnly)).toBe(true);
    expect(matchesTypeFilter(transfer, incomeOnly)).toBe(false);
    expect(matchesTypeFilter(fx, incomeOnly)).toBe(false);
  });
});

describe("matchesAccountFilter — SPEC-05 T-17", () => {
  it("includes transfer when filtering by destination account", () => {
    const transfer = tx({
      id: "t",
      type: "transfer",
      accountId: "acc-a",
      counterpartyAccountId: "acc-b",
    });
    expect(matchesAccountFilter(transfer, "acc-b")).toBe(true);
    expect(matchesAccountFilter(transfer, "acc-a")).toBe(true);
    expect(matchesAccountFilter(transfer, "acc-other")).toBe(false);
  });
});

describe("matchesCategoryFilter — SPEC-05 T-18", () => {
  it("excludes transfers (null category) when filtering by category", () => {
    const expense = tx({
      id: "e",
      type: "expense",
      categoryId: "cat-x",
    });
    const transfer = tx({
      id: "t",
      type: "transfer",
      categoryId: null,
      counterpartyAccountId: "acc-b",
    });
    expect(matchesCategoryFilter(expense, "cat-x")).toBe(true);
    expect(matchesCategoryFilter(transfer, "cat-x")).toBe(false);
  });
});
