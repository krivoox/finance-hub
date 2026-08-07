import { describe, expect, it } from "vitest";

import { CONSOLIDATION_RATE_SCALE } from "@/features/dashboard/domain/consolidation";

import {
  computeSubscriptionAmountCents,
  computeSubscriptionListBreakdown,
  computeSubscriptionUsdBreakdown,
  DEFAULT_TAX_MARKUP_BPS,
  preferSubscriptionAccountId,
  preferSubscriptionCategoryId,
  SubscriptionAmountError,
} from "./subscription-amount";

describe("SPEC-18 subscription templates — amount math", () => {
  describe("computeSubscriptionListBreakdown", () => {
    it("Given ARS list + 23% markup, When breakdown, Then subtotal + tax = total in ARS", () => {
      // Given — Netflix Estándar 14.999 ARS
      const listPriceCents = 1_499_900;

      // When
      const result = computeSubscriptionListBreakdown({
        listPriceCents,
        listCurrency: "ARS",
        taxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
      });

      // Then — 1499900 * 1.23 = 1_844_877
      expect(result.currency).toBe("ARS");
      expect(result.subtotalCents).toBe(1_499_900);
      expect(result.totalCents).toBe(1_844_877);
      expect(result.taxCents).toBe(344_977);
      expect(result.subtotalCents + result.taxCents).toBe(result.totalCents);
    });

    it("Given taxes off (0 bps), When breakdown, Then total equals list price", () => {
      const result = computeSubscriptionListBreakdown({
        listPriceCents: 449_900,
        listCurrency: "ARS",
        taxMarkupBps: 0,
      });

      expect(result).toEqual({
        currency: "ARS",
        subtotalCents: 449_900,
        taxCents: 0,
        totalCents: 449_900,
      });
    });
  });

  describe("computeSubscriptionUsdBreakdown", () => {
    it("Given list price and 23% markup (2300 bps), When breakdown, Then subtotal + tax = total", () => {
      const listPriceUsdCents = 1_599;

      const result = computeSubscriptionUsdBreakdown({
        listPriceUsdCents,
        taxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
      });

      expect(result.subtotalCents).toBe(1_599);
      expect(result.totalCents).toBe(1_967);
      expect(result.taxCents).toBe(368);
      expect(result.subtotalCents + result.taxCents).toBe(result.totalCents);
    });

    it("Given invalid list price, When breakdown, Then throws", () => {
      expect(() =>
        computeSubscriptionUsdBreakdown({
          listPriceUsdCents: 0,
          taxMarkupBps: 2300,
        }),
      ).toThrow(SubscriptionAmountError);
    });
  });

  describe("computeSubscriptionAmountCents", () => {
    it("Given USD account + 23% markup, When compute, Then amount is USD total cents", () => {
      const amountCents = computeSubscriptionAmountCents({
        listPriceCents: 599,
        listCurrency: "USD",
        taxMarkupBps: 2300,
        accountCurrency: "USD",
      });

      expect(amountCents).toBe(737);
    });

    it("Given ARS list + ARS account, When compute, Then no FX needed", () => {
      const amountCents = computeSubscriptionAmountCents({
        listPriceCents: 329_900,
        listCurrency: "ARS",
        taxMarkupBps: 2300,
        accountCurrency: "ARS",
      });

      // 329900 * 1.23 = 405_777
      expect(amountCents).toBe(405_777);
    });

    it("Given USD list + ARS account + MEP, When compute, Then converts USD total to ARS", () => {
      const rateScaled = 1_400 * CONSOLIDATION_RATE_SCALE;

      const amountCents = computeSubscriptionAmountCents({
        listPriceCents: 1_000,
        listCurrency: "USD",
        taxMarkupBps: 2300,
        accountCurrency: "ARS",
        rateScaled,
        scale: CONSOLIDATION_RATE_SCALE,
      });

      expect(amountCents).toBe(1_722_000);
    });

    it("Given ARS list + USD account without rate, When compute, Then throws", () => {
      expect(() =>
        computeSubscriptionAmountCents({
          listPriceCents: 100_000,
          listCurrency: "ARS",
          taxMarkupBps: 0,
          accountCurrency: "USD",
        }),
      ).toThrow(SubscriptionAmountError);
    });

    it("Given taxes off + USD account, When compute, Then amount equals list price", () => {
      expect(
        computeSubscriptionAmountCents({
          listPriceUsdCents: 2_499,
          taxMarkupBps: 0,
          accountCurrency: "USD",
        }),
      ).toBe(2_499);
    });
  });

  describe("preferSubscriptionCategoryId / preferSubscriptionAccountId", () => {
    it("Given preferred Streaming, When prefer category, Then picks Streaming (emoji-tolerant)", () => {
      const id = preferSubscriptionCategoryId(
        [
          { id: "c1", name: "💡 Servicios", kind: "expense" },
          { id: "c2", name: "📺 Streaming", kind: "expense" },
          { id: "c3", name: "🤖 IA", kind: "expense" },
        ],
        "📺 Streaming",
      );
      expect(id).toBe("c2");
    });

    it("Given preferred name without emoji, When prefer category, Then still matches", () => {
      const id = preferSubscriptionCategoryId(
        [
          { id: "c1", name: "🤖 IA", kind: "expense" },
          { id: "c2", name: "💡 Servicios", kind: "expense" },
        ],
        "IA",
      );
      expect(id).toBe("c1");
    });

    it("Given Servicios and Ocio, When prefer without preferred, Then picks Servicios", () => {
      const id = preferSubscriptionCategoryId([
        { id: "c1", name: "Comida", kind: "expense" },
        { id: "c2", name: "Servicios", kind: "expense" },
        { id: "c3", name: "Ocio", kind: "expense" },
      ]);
      expect(id).toBe("c2");
    });

    it("Given no preferred names, When prefer category, Then first expense", () => {
      const id = preferSubscriptionCategoryId([
        { id: "i1", name: "Sueldo", kind: "income" },
        { id: "c1", name: "Comida", kind: "expense" },
      ]);
      expect(id).toBe("c1");
    });

    it("Given mixed currencies, When prefer account, Then ARS first", () => {
      const id = preferSubscriptionAccountId([
        { id: "u1", currency: "USD" },
        { id: "a1", currency: "ARS" },
      ]);
      expect(id).toBe("a1");
    });
  });
});
