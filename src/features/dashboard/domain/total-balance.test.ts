import { describe, expect, it } from "vitest";
import { computeTotalBalance } from "./total-balance";
import type { DashboardAccount } from "./types";

function account(overrides: Partial<DashboardAccount>): DashboardAccount {
  return {
    type: "checking",
    currency: "ARS",
    isArchived: false,
    currentBalance: { amountCents: 0, currency: "ARS" },
    ...overrides,
  };
}

describe("computeTotalBalance — SPEC-12 §4 (total balance)", () => {
  it("returns 0 for an empty workspace (T-01)", () => {
    expect(computeTotalBalance([], "ARS")).toEqual({
      amountCents: 0,
      currency: "ARS",
    });
  });

  it("sums balances of non-credit accounts", () => {
    const accounts: DashboardAccount[] = [
      account({ currentBalance: { amountCents: 10_000, currency: "ARS" } }),
      account({
        type: "savings",
        currentBalance: { amountCents: 25_000, currency: "ARS" },
      }),
      account({
        type: "cash",
        currentBalance: { amountCents: 5_000, currency: "ARS" },
      }),
    ];
    expect(computeTotalBalance(accounts, "ARS").amountCents).toBe(40_000);
  });

  it("subtracts credit-card debt from net worth (SPEC-03 §5 convention)", () => {
    const accounts: DashboardAccount[] = [
      account({
        currentBalance: { amountCents: 100_000, currency: "ARS" },
      }),
      account({
        type: "credit_card",
        currentBalance: { amountCents: 30_000, currency: "ARS" },
      }),
    ];
    expect(computeTotalBalance(accounts, "ARS").amountCents).toBe(70_000);
  });

  it("can produce a negative total when debt exceeds assets", () => {
    const accounts: DashboardAccount[] = [
      account({
        currentBalance: { amountCents: 1_000, currency: "ARS" },
      }),
      account({
        type: "credit_card",
        currentBalance: { amountCents: 10_000, currency: "ARS" },
      }),
    ];
    expect(computeTotalBalance(accounts, "ARS").amountCents).toBe(-9_000);
  });

  it("ignores archived accounts", () => {
    const accounts: DashboardAccount[] = [
      account({ currentBalance: { amountCents: 10_000, currency: "ARS" } }),
      account({
        isArchived: true,
        currentBalance: { amountCents: 999_999, currency: "ARS" },
      }),
      account({
        type: "credit_card",
        isArchived: true,
        currentBalance: { amountCents: 999_999, currency: "ARS" },
      }),
    ];
    expect(computeTotalBalance(accounts, "ARS").amountCents).toBe(10_000);
  });

  it("skips accounts whose balance currency does not match the requested currency", () => {
    const accounts: DashboardAccount[] = [
      account({ currentBalance: { amountCents: 10_000, currency: "ARS" } }),
      account({
        currency: "USD",
        currentBalance: { amountCents: 500, currency: "USD" },
      }),
    ];
    expect(computeTotalBalance(accounts, "ARS")).toEqual({
      amountCents: 10_000,
      currency: "ARS",
    });
  });

  it("returns the requested currency even when there are no matching accounts", () => {
    const accounts: DashboardAccount[] = [
      account({
        currency: "USD",
        currentBalance: { amountCents: 500, currency: "USD" },
      }),
    ];
    expect(computeTotalBalance(accounts, "ARS")).toEqual({
      amountCents: 0,
      currency: "ARS",
    });
  });
});
