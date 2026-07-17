import { describe, expect, it } from "vitest";
import { computeBalancesByCurrency } from "./balances-by-currency";
import {
  arsPerUsdToRateScaled,
  computeConsolidatedNetWorth,
  convertArsUsdCents,
  convertCents,
  CONSOLIDATION_RATE_SCALE,
  InvalidConsolidationRateError,
} from "./consolidation";
import type { DashboardAccount } from "./types";

function account(opts: {
  currency: string;
  amountCents: number;
  type?: DashboardAccount["type"];
  isArchived?: boolean;
}): DashboardAccount {
  return {
    type: opts.type ?? "checking",
    currency: opts.currency,
    isArchived: opts.isArchived ?? false,
    currentBalance: {
      amountCents: opts.amountCents,
      currency: opts.currency,
    },
  };
}

describe("convertCents / convertArsUsdCents", () => {
  const rate = arsPerUsdToRateScaled(1400); // 1 USD = 1400 ARS

  it("converts USD cents to ARS cents with rounding", () => {
    // 10 USD = 1000 cents → 1_400_000 ARS cents
    expect(convertArsUsdCents(1_000, "USD", "ARS", rate)).toBe(1_400_000);
  });

  it("converts ARS cents to USD cents", () => {
    expect(convertArsUsdCents(1_400_000, "ARS", "USD", rate)).toBe(1_000);
  });

  it("returns same amount when currencies match", () => {
    expect(convertArsUsdCents(500, "ARS", "ARS", rate)).toBe(500);
  });

  it("rejects rate ≤ 0", () => {
    expect(() => convertArsUsdCents(100, "USD", "ARS", 0)).toThrow(
      InvalidConsolidationRateError,
    );
  });

  it("rounds half-up style via Math.round", () => {
    // 1 USD cent * 1400.5 would need fractional rate; use odd division
    const oddRate = Math.round(1400.4 * CONSOLIDATION_RATE_SCALE);
    const converted = convertCents(
      3,
      "USD",
      "ARS",
      oddRate,
      CONSOLIDATION_RATE_SCALE,
      "ARS",
      "USD",
    );
    expect(Number.isInteger(converted)).toBe(true);
  });
});

describe("computeConsolidatedNetWorth — SPEC-12 T-02b", () => {
  it("consolidates 500_000 ARS + 1_000 USD at 1400 ARS/USD", () => {
    const balances = computeBalancesByCurrency([
      account({ currency: "ARS", amountCents: 500_000 }),
      account({ currency: "USD", amountCents: 1_000 }),
    ]);
    const rateScaled = arsPerUsdToRateScaled(1400);
    const consolidated = computeConsolidatedNetWorth(balances, "ARS", {
      quoteCurrency: "USD",
      rateScaled,
      scale: CONSOLIDATION_RATE_SCALE,
    });
    expect(consolidated).toEqual({
      amountCents: 1_900_000,
      currency: "ARS",
    });
  });

  it("rejects invalid rate", () => {
    const balances = computeBalancesByCurrency([
      account({ currency: "ARS", amountCents: 100 }),
    ]);
    expect(() =>
      computeConsolidatedNetWorth(balances, "ARS", {
        quoteCurrency: "USD",
        rateScaled: 0,
        scale: CONSOLIDATION_RATE_SCALE,
      }),
    ).toThrow(InvalidConsolidationRateError);
  });
});
