import { describe, expect, it } from "vitest";

import {
  AMOUNT_DECIMAL_SEPARATOR,
  formatCentsAsAmountInput,
  formatDecimalInput,
  normalizeDecimalInput,
  parseAmountCents,
  parseDecimalNumber,
} from "./parse-amount";

describe("amount input parsing (KRI-33: comma decimal separator)", () => {
  it("uses comma as the canonical decimal separator", () => {
    expect(AMOUNT_DECIMAL_SEPARATOR).toBe(",");
  });

  describe("normalizeDecimalInput", () => {
    it("keeps digits and a single comma", () => {
      expect(normalizeDecimalInput("12,50")).toBe("12,50");
    });

    it("converts a period typed as decimal into a comma", () => {
      expect(normalizeDecimalInput("12.5")).toBe("12,5");
      expect(normalizeDecimalInput("12.")).toBe("12,");
    });

    it("strips letters and extra separators while typing", () => {
      expect(normalizeDecimalInput("a12,5b")).toBe("12,5");
      expect(normalizeDecimalInput("12,5,9")).toBe("12,59");
    });

    it("caps fraction digits at two for money amounts", () => {
      expect(normalizeDecimalInput("12,567")).toBe("12,56");
      expect(normalizeDecimalInput("12.567")).toBe("12,56");
    });

    it("allows a configurable fraction length for rates", () => {
      expect(
        normalizeDecimalInput("1480.2567", { maxFractionDigits: 4 }),
      ).toBe("1480,2567");
    });

    it("keeps a trailing comma so the user can type cents", () => {
      expect(normalizeDecimalInput("10,")).toBe("10,");
    });

    it("keeps a leading minus when allowNegative is true", () => {
      expect(normalizeDecimalInput("-12,5", { allowNegative: true })).toBe(
        "-12,5",
      );
      expect(normalizeDecimalInput("-", { allowNegative: true })).toBe("-");
      expect(normalizeDecimalInput("-12,5")).toBe("12,5");
    });

    it("treats the last separator as decimal when both comma and period appear (paste)", () => {
      expect(normalizeDecimalInput("1.234,56")).toBe("1234,56");
      expect(normalizeDecimalInput("1,234.56")).toBe("1234,56");
    });
  });

  describe("parseAmountCents", () => {
    it("parses comma decimals into integer cents", () => {
      expect(parseAmountCents("12,50")).toBe(1_250);
      expect(parseAmountCents("0,01")).toBe(1);
      expect(parseAmountCents("100")).toBe(10_000);
    });

    it("parses period decimals the same as comma (device-agnostic)", () => {
      expect(parseAmountCents("12.50")).toBe(1_250);
      expect(parseAmountCents("12,50")).toBe(1_250);
    });

    it("rounds half-up to the nearest cent", () => {
      expect(parseAmountCents("1,005")).toBe(101);
      expect(parseAmountCents("1,004")).toBe(100);
    });

    it("rejects empty, non-numeric and non-positive amounts by default", () => {
      expect(parseAmountCents("")).toBeNull();
      expect(parseAmountCents("   ")).toBeNull();
      expect(parseAmountCents(",")).toBeNull();
      expect(parseAmountCents("abc")).toBeNull();
      expect(parseAmountCents("0")).toBeNull();
      expect(parseAmountCents("0,00")).toBeNull();
      expect(parseAmountCents("-10,00")).toBeNull();
    });

    it("accepts zero when allowZero is true (initial balances)", () => {
      expect(parseAmountCents("0", { allowZero: true })).toBe(0);
      expect(parseAmountCents("0,00", { allowZero: true })).toBe(0);
      expect(parseAmountCents("", { allowZero: true })).toBeNull();
    });

    it("parses a leading minus when allowNegative is true (SPEC-22 overdraft)", () => {
      expect(
        parseAmountCents("-10,00", { allowNegative: true }),
      ).toBe(-1_000);
      expect(
        parseAmountCents("-0,50", { allowNegative: true, allowZero: true }),
      ).toBe(-50);
      expect(parseAmountCents("-10,00")).toBeNull();
    });

    it("parses Argentine-formatted paste with thousands grouping", () => {
      expect(parseAmountCents("1.234,56")).toBe(123_456);
    });
  });

  describe("parseDecimalNumber", () => {
    it("parses a positive decimal using comma or period", () => {
      expect(parseDecimalNumber("1480,5")).toBe(1480.5);
      expect(parseDecimalNumber("1480.5")).toBe(1480.5);
    });

    it("rejects empty or non-positive values by default", () => {
      expect(parseDecimalNumber("")).toBeNull();
      expect(parseDecimalNumber("0")).toBeNull();
      expect(parseDecimalNumber("-1")).toBeNull();
    });

    it("accepts zero when allowZero is true", () => {
      expect(parseDecimalNumber("0", { allowZero: true })).toBe(0);
    });
  });

  describe("formatCentsAsAmountInput", () => {
    it("formats cents with comma and two fraction digits", () => {
      expect(formatCentsAsAmountInput(1_250)).toBe("12,50");
      expect(formatCentsAsAmountInput(100)).toBe("1,00");
      expect(formatCentsAsAmountInput(0)).toBe("0,00");
      expect(formatCentsAsAmountInput(-500)).toBe("-5,00");
    });
  });

  describe("formatDecimalInput", () => {
    it("formats a number with comma as decimal separator", () => {
      expect(formatDecimalInput(1480.5)).toBe("1480,50");
      expect(formatDecimalInput(100)).toBe("100,00");
    });
  });
});
