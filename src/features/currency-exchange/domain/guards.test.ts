import { describe, expect, it } from "vitest";
import {
  InvalidExchangeAmountError,
  SameAccountExchangeError,
  SameCurrencyExchangeError,
  UnsupportedExchangeCurrencyError,
} from "./errors";
import {
  assertValidCurrencyExchange,
  formatImpliedRateCaption,
  impliedRateScaled,
  IMPLIED_RATE_SCALE,
} from "./guards";

describe("assertValidCurrencyExchange — SPEC-16", () => {
  const valid = {
    fromAccountId: "acc-ars",
    toAccountId: "acc-usd",
    fromCurrency: "ARS",
    toCurrency: "USD",
    fromCents: 1_000_000,
    toCents: 70_000,
  };

  it("T-01 · accepts ARS→USD buy with positive amounts", () => {
    expect(() => assertValidCurrencyExchange(valid)).not.toThrow();
  });

  it("T-02 · rejects same-currency accounts", () => {
    expect(() =>
      assertValidCurrencyExchange({
        ...valid,
        toCurrency: "ARS",
      }),
    ).toThrow(SameCurrencyExchangeError);
  });

  it("rejects same account id", () => {
    expect(() =>
      assertValidCurrencyExchange({
        ...valid,
        toAccountId: "acc-ars",
      }),
    ).toThrow(SameAccountExchangeError);
  });

  it("rejects zero / negative amounts", () => {
    expect(() =>
      assertValidCurrencyExchange({ ...valid, fromCents: 0 }),
    ).toThrow(InvalidExchangeAmountError);
    expect(() =>
      assertValidCurrencyExchange({ ...valid, toCents: -1 }),
    ).toThrow(InvalidExchangeAmountError);
  });

  it("rejects non-integer amounts", () => {
    expect(() =>
      assertValidCurrencyExchange({ ...valid, fromCents: 1.5 }),
    ).toThrow(InvalidExchangeAmountError);
  });

  it("rejects unsupported currencies", () => {
    expect(() =>
      assertValidCurrencyExchange({ ...valid, fromCurrency: "EUR" }),
    ).toThrow(UnsupportedExchangeCurrencyError);
  });
});

describe("impliedRateScaled — SPEC-16 §4", () => {
  it("T-01 · 1_000_000 ARS → 70_000 USD yields scaled 0.07", () => {
    expect(impliedRateScaled(1_000_000, 70_000)).toBe(
      Math.round((70_000 * IMPLIED_RATE_SCALE) / 1_000_000),
    );
  });

  it("rejects non-positive inputs", () => {
    expect(() => impliedRateScaled(0, 100)).toThrow(InvalidExchangeAmountError);
  });
});

describe("formatImpliedRateCaption", () => {
  it("shows ARS per USD for a dollar purchase", () => {
    // 1_000_000 ARS cents = 10_000 ARS; 70_000 USD cents = 700 USD
    // → 10_000/700 ≈ 14.2857 ARS per USD
    const caption = formatImpliedRateCaption(
      "ARS",
      "USD",
      1_000_000,
      70_000,
    );
    expect(caption).toMatch(/^1 USD ≈ /);
    expect(caption).toContain("ARS");
  });
});
