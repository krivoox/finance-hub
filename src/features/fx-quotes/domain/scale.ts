import { USD_QUOTE_SCALE } from "./types";
import { InvalidUsdQuoteRateError } from "./errors";

/**
 * API majors (ARS per 1 USD) → persistence scale shared with consolidation.
 * SPEC-19 T-01 / T-02 / T-03.
 */
export function majorArsPerUsdToRateScaled(
  majorArsPerUsd: number,
  scale: number = USD_QUOTE_SCALE,
): number {
  if (!Number.isFinite(majorArsPerUsd) || majorArsPerUsd <= 0) {
    throw new InvalidUsdQuoteRateError();
  }
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new InvalidUsdQuoteRateError("scale debe ser mayor a 0");
  }
  return Math.round(majorArsPerUsd * scale);
}
