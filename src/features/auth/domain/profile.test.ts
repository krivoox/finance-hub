import { describe, expect, it } from "vitest";
import {
  ProfileValidationError,
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  isValidTimezone,
  normalizeDisplayName,
  validateProfileUpdate,
} from "./profile";

describe("Auth profile — pure validators (SPEC-01 T-05)", () => {
  describe("SUPPORTED_CURRENCIES", () => {
    it("includes at least ARS, USD, EUR, BRL, CLP, UYU (ISO 4217)", () => {
      for (const code of ["ARS", "USD", "EUR", "BRL", "CLP", "UYU"] as const) {
        expect(SUPPORTED_CURRENCIES).toContain(code);
      }
    });

    it("only contains uppercase 3-letter ISO codes", () => {
      for (const code of SUPPORTED_CURRENCIES) {
        expect(code).toMatch(/^[A-Z]{3}$/);
      }
    });
  });

  describe("isSupportedCurrency", () => {
    it("returns true for a supported code", () => {
      expect(isSupportedCurrency("ARS")).toBe(true);
      expect(isSupportedCurrency("USD")).toBe(true);
    });

    it("returns false for unsupported / malformed codes", () => {
      expect(isSupportedCurrency("XYZ")).toBe(false);
      expect(isSupportedCurrency("ars")).toBe(false);
      expect(isSupportedCurrency("ARSS")).toBe(false);
      expect(isSupportedCurrency("")).toBe(false);
    });
  });

  describe("isValidTimezone", () => {
    it("accepts common IANA timezones", () => {
      expect(isValidTimezone("America/Argentina/Buenos_Aires")).toBe(true);
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("Europe/Madrid")).toBe(true);
      expect(isValidTimezone("UTC")).toBe(true);
    });

    it("rejects empty or whitespace-only strings", () => {
      expect(isValidTimezone("")).toBe(false);
      expect(isValidTimezone("   ")).toBe(false);
    });

    it("rejects clearly invalid inputs", () => {
      expect(isValidTimezone("not_a_timezone")).toBe(false);
      expect(isValidTimezone("America/Nowhere")).toBe(false);
    });
  });

  describe("normalizeDisplayName", () => {
    it("trims whitespace", () => {
      expect(normalizeDisplayName("  Ana  ")).toBe("Ana");
    });

    it("collapses inner whitespace to a single space", () => {
      expect(normalizeDisplayName("Ana   Maria")).toBe("Ana Maria");
    });

    it("returns undefined when the input is empty after trim", () => {
      expect(normalizeDisplayName("")).toBeUndefined();
      expect(normalizeDisplayName("   ")).toBeUndefined();
    });
  });

  describe("validateProfileUpdate", () => {
    it("returns normalized values for a valid input", () => {
      const result = validateProfileUpdate({
        displayName: "  Ana  ",
        preferredCurrency: "USD",
        timezone: "America/Argentina/Buenos_Aires",
      });
      expect(result).toEqual({
        displayName: "Ana",
        preferredCurrency: "USD",
        timezone: "America/Argentina/Buenos_Aires",
      });
    });

    it("omits displayName when empty", () => {
      const result = validateProfileUpdate({
        displayName: "   ",
        preferredCurrency: "ARS",
        timezone: "UTC",
      });
      expect(result.displayName).toBeUndefined();
      expect(result.preferredCurrency).toBe("ARS");
      expect(result.timezone).toBe("UTC");
    });

    it("throws ProfileValidationError for unsupported currency", () => {
      expect(() =>
        validateProfileUpdate({
          preferredCurrency: "XYZ",
          timezone: "UTC",
        }),
      ).toThrow(ProfileValidationError);
    });

    it("throws ProfileValidationError for invalid timezone", () => {
      expect(() =>
        validateProfileUpdate({
          preferredCurrency: "ARS",
          timezone: "not_a_zone",
        }),
      ).toThrow(ProfileValidationError);
    });

    it("throws ProfileValidationError for displayName too short", () => {
      expect(() =>
        validateProfileUpdate({
          displayName: "A",
          preferredCurrency: "ARS",
          timezone: "UTC",
        }),
      ).toThrow(ProfileValidationError);
    });

    it("throws ProfileValidationError for displayName too long", () => {
      expect(() =>
        validateProfileUpdate({
          displayName: "x".repeat(61),
          preferredCurrency: "ARS",
          timezone: "UTC",
        }),
      ).toThrow(ProfileValidationError);
    });
  });
});
