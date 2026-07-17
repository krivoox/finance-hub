import { describe, expect, it } from "vitest";
import {
  balancesByCurrencyEntries,
  computeBalancesByCurrency,
} from "./balances-by-currency";
import type { DashboardAccount } from "./types";

function account(opts: {
  type: DashboardAccount["type"];
  currency: string;
  amountCents: number;
  isArchived?: boolean;
}): DashboardAccount {
  return {
    type: opts.type,
    currency: opts.currency,
    isArchived: opts.isArchived ?? false,
    currentBalance: {
      amountCents: opts.amountCents,
      currency: opts.currency,
    },
  };
}

describe("computeBalancesByCurrency", () => {
  it("groups ARS and USD separately", () => {
    const accounts = [
      account({
        type: "checking",
        currency: "ARS",
        amountCents: 500_000,
      }),
      account({
        type: "savings",
        currency: "USD",
        amountCents: 100_000,
      }),
    ];

    const map = computeBalancesByCurrency(accounts);
    expect(map.get("ARS")).toEqual({ amountCents: 500_000, currency: "ARS" });
    expect(map.get("USD")).toEqual({ amountCents: 100_000, currency: "USD" });
  });

  it("subtracts credit card debt within its currency", () => {
    const accounts = [
      account({
        type: "checking",
        currency: "ARS",
        amountCents: 100_000,
      }),
      account({
        type: "credit_card",
        currency: "ARS",
        amountCents: 20_000,
      }),
    ];

    expect(computeBalancesByCurrency(accounts).get("ARS")).toEqual({
      amountCents: 80_000,
      currency: "ARS",
    });
  });

  it("skips archived accounts", () => {
    const accounts = [
      account({
        type: "checking",
        currency: "USD",
        amountCents: 50_000,
        isArchived: true,
      }),
    ];
    expect(computeBalancesByCurrency(accounts).size).toBe(0);
  });

  it("orders ARS then USD in entries helper", () => {
    const map = computeBalancesByCurrency([
      account({
        type: "checking",
        currency: "USD",
        amountCents: 1,
      }),
      account({
        type: "checking",
        currency: "ARS",
        amountCents: 2,
      }),
    ]);
    expect(balancesByCurrencyEntries(map).map((b) => b.currency)).toEqual([
      "ARS",
      "USD",
    ]);
  });
});
