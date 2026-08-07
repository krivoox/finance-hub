import type { AccountCurrency } from "@/domain/money/currencies";
import { convertArsUsdCents } from "@/features/dashboard/domain/consolidation";
import type { QuoteSide } from "./types";

export function pickRateScaled(
  line: { buyRateScaled: number; sellRateScaled: number },
  side: QuoteSide,
): number {
  return side === "buy" ? line.buyRateScaled : line.sellRateScaled;
}

/**
 * Read-only ARS↔USD conversion with a quote line (default side: sell).
 * SPEC-19 T-09 / T-10.
 */
export function convertWithUsdQuote(input: {
  amountCents: number;
  from: AccountCurrency;
  to: AccountCurrency;
  line: {
    buyRateScaled: number;
    sellRateScaled: number;
    scale: number;
  };
  side?: QuoteSide;
}): number {
  const side = input.side ?? "sell";
  const rateScaled = pickRateScaled(input.line, side);
  return convertArsUsdCents(
    input.amountCents,
    input.from,
    input.to,
    rateScaled,
    input.line.scale,
  );
}
