import { describe, expect, it } from "vitest";
import {
  CurrencyMismatchError,
  Money,
  MoneyError,
} from "./money";

describe("Money value object (ADR-001: integer cents)", () => {
  describe("Money.of validation", () => {
    it("creates a Money from non-negative integer cents and 3-letter currency", () => {
      const money = Money.of(1_000, "ARS");
      expect(money.amountCents).toBe(1_000);
      expect(money.currency).toBe("ARS");
    });

    it("rejects non-integer cents", () => {
      expect(() => Money.of(1.5, "ARS")).toThrow(MoneyError);
      expect(() => Money.of(0.1, "USD")).toThrow(/integer/i);
    });

    it("rejects negative amounts", () => {
      expect(() => Money.of(-1, "ARS")).toThrow(MoneyError);
      expect(() => Money.of(-100, "ARS")).toThrow(/non-negative/i);
    });

    it("rejects non-finite amounts", () => {
      expect(() => Money.of(Number.NaN, "ARS")).toThrow(MoneyError);
      expect(() => Money.of(Number.POSITIVE_INFINITY, "ARS")).toThrow(MoneyError);
    });

    it("rejects invalid currency codes", () => {
      expect(() => Money.of(100, "AR")).toThrow(MoneyError);
      expect(() => Money.of(100, "arsenal")).toThrow(MoneyError);
      expect(() => Money.of(100, "ars")).toThrow(MoneyError);
      expect(() => Money.of(100, "")).toThrow(MoneyError);
    });

    it("accepts zero as a valid amount", () => {
      expect(() => Money.of(0, "ARS")).not.toThrow();
      expect(Money.zero("USD").amountCents).toBe(0);
    });
  });

  describe("arithmetic", () => {
    it("adds two Money instances of the same currency", () => {
      const a = Money.of(1_500, "ARS");
      const b = Money.of(2_500, "ARS");
      const result = a.add(b);
      expect(result.amountCents).toBe(4_000);
      expect(result.currency).toBe("ARS");
    });

    it("subtracts two Money instances of the same currency", () => {
      const a = Money.of(5_000, "USD");
      const b = Money.of(1_500, "USD");
      expect(a.subtract(b).amountCents).toBe(3_500);
    });

    it("throws when subtracting would produce a negative amount", () => {
      const a = Money.of(1_000, "ARS");
      const b = Money.of(2_000, "ARS");
      expect(() => a.subtract(b)).toThrow(MoneyError);
    });

    it("rejects arithmetic with mismatched currencies", () => {
      const ars = Money.of(1_000, "ARS");
      const usd = Money.of(1_000, "USD");
      expect(() => ars.add(usd)).toThrow(CurrencyMismatchError);
      expect(() => ars.subtract(usd)).toThrow(CurrencyMismatchError);
    });

    it("is immutable: add returns a new instance", () => {
      const a = Money.of(1_000, "ARS");
      const b = Money.of(500, "ARS");
      const c = a.add(b);
      expect(a.amountCents).toBe(1_000);
      expect(b.amountCents).toBe(500);
      expect(c.amountCents).toBe(1_500);
      expect(c).not.toBe(a);
    });
  });

  describe("comparison", () => {
    it("equals returns true only for same currency and amount", () => {
      expect(Money.of(100, "ARS").equals(Money.of(100, "ARS"))).toBe(true);
      expect(Money.of(100, "ARS").equals(Money.of(200, "ARS"))).toBe(false);
      expect(Money.of(100, "ARS").equals(Money.of(100, "USD"))).toBe(false);
    });

    it("compareTo returns -1, 0, or 1 for same currency", () => {
      const a = Money.of(1_000, "ARS");
      const b = Money.of(2_000, "ARS");
      expect(a.compareTo(b)).toBe(-1);
      expect(b.compareTo(a)).toBe(1);
      expect(a.compareTo(Money.of(1_000, "ARS"))).toBe(0);
    });

    it("compareTo throws on mismatched currencies", () => {
      const ars = Money.of(100, "ARS");
      const usd = Money.of(100, "USD");
      expect(() => ars.compareTo(usd)).toThrow(CurrencyMismatchError);
    });

    it("isZero identifies the zero amount", () => {
      expect(Money.zero("ARS").isZero()).toBe(true);
      expect(Money.of(1, "ARS").isZero()).toBe(false);
    });
  });

  describe("serialization", () => {
    it("toJSON returns a plain MoneyLike shape", () => {
      const m = Money.of(12_345, "ARS");
      expect(m.toJSON()).toEqual({ amountCents: 12_345, currency: "ARS" });
    });
  });
});
