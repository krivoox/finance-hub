import type { ConsolidationRateFromMep, UsdQuoteLineDraft } from "./types";
import { MepQuoteUnavailableError } from "./errors";

/**
 * Build the consolidation upsert patch from a MEP (bolsa) sell quote.
 * SPEC-19 T-11 / T-12. Does not write to DB.
 */
export function buildConsolidationRateFromMepQuote(
  line: Pick<
    UsdQuoteLineDraft,
    "casa" | "sellRateScaled" | "scale" | "providerUpdatedAt"
  >,
): ConsolidationRateFromMep {
  if (line.casa !== "bolsa") {
    throw new MepQuoteUnavailableError();
  }
  if (line.sellRateScaled <= 0) {
    throw new MepQuoteUnavailableError();
  }
  return {
    rateScaled: line.sellRateScaled,
    scale: line.scale,
    label: "MEP",
    quoteCurrency: "USD",
    asOf: line.providerUpdatedAt,
  };
}
