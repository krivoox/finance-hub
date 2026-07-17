/**
 * Manual consolidation rate (ADR-006 / SPEC-12 FR-06).
 *
 * `rateScaled / scale` = how many base major units per 1 quote major unit
 * (e.g. ARS per USD). Converting cents uses the same ratio.
 */

import type { AccountCurrency } from "@/domain/money/currencies";
import { isAccountCurrency } from "@/domain/money/currencies";
import type { BalancesByCurrency } from "@/features/dashboard/domain/balances-by-currency";
import type { TotalBalance } from "@/features/dashboard/domain/types";

export const CONSOLIDATION_RATE_SCALE = 1_000_000;

export class ConsolidationRateDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsolidationRateDomainError";
  }
}

export class InvalidConsolidationRateError extends ConsolidationRateDomainError {
  constructor(message = "La tasa de consolidación debe ser mayor a 0") {
    super(message);
    this.name = "InvalidConsolidationRateError";
  }
}

export class UnsupportedConversionError extends ConsolidationRateDomainError {
  constructor(from: string, to: string) {
    super(`No se puede convertir ${from} → ${to} (solo ARS↔USD)`);
    this.name = "UnsupportedConversionError";
  }
}

export type ConsolidationRateLike = {
  readonly quoteCurrency: string;
  readonly rateScaled: number;
  readonly scale: number;
};

/**
 * Convert cents between ARS and USD using a consolidation rate.
 * `rateScaled/scale` = base majors per 1 quote major (workspace base vs quote).
 */
export function convertCents(
  amountCents: number,
  from: string,
  to: string,
  rateScaled: number,
  scale: number,
  baseCurrency: string,
  quoteCurrency: string,
): number {
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
    throw new InvalidConsolidationRateError(
      "El monto debe ser un entero en centavos",
    );
  }
  if (rateScaled <= 0 || scale <= 0) {
    throw new InvalidConsolidationRateError();
  }
  if (from === to) return amountCents;

  if (
    !isAccountCurrency(from) ||
    !isAccountCurrency(to) ||
    !isAccountCurrency(baseCurrency) ||
    !isAccountCurrency(quoteCurrency)
  ) {
    throw new UnsupportedConversionError(from, to);
  }

  if (quoteCurrency !== "USD" && quoteCurrency !== "ARS") {
    throw new UnsupportedConversionError(from, to);
  }

  // rate = base per 1 quote (e.g. ARS per USD)
  if (from === quoteCurrency && to === baseCurrency) {
    return Math.round((amountCents * rateScaled) / scale);
  }
  if (from === baseCurrency && to === quoteCurrency) {
    return Math.round((amountCents * scale) / rateScaled);
  }

  throw new UnsupportedConversionError(from, to);
}

/**
 * Convenience when base is ARS and quote is USD (product default).
 * rateScaled/scale = ARS per 1 USD.
 */
export function convertArsUsdCents(
  amountCents: number,
  from: AccountCurrency,
  to: AccountCurrency,
  rateScaled: number,
  scale: number = CONSOLIDATION_RATE_SCALE,
): number {
  return convertCents(
    amountCents,
    from,
    to,
    rateScaled,
    scale,
    "ARS",
    "USD",
  );
}

export function assertValidConsolidationRate(rateScaled: number): void {
  if (!Number.isFinite(rateScaled) || !Number.isInteger(rateScaled)) {
    throw new InvalidConsolidationRateError(
      "La tasa debe ser un entero (escalado)",
    );
  }
  if (rateScaled <= 0) {
    throw new InvalidConsolidationRateError();
  }
}

/**
 * SPEC-12 T-02b — Sum balances into baseCurrency using the manual rate.
 */
export function computeConsolidatedNetWorth(
  balancesByCurrency: BalancesByCurrency,
  baseCurrency: string,
  rate: ConsolidationRateLike,
): TotalBalance {
  assertValidConsolidationRate(rate.rateScaled);
  if (rate.scale <= 0) {
    throw new InvalidConsolidationRateError("scale debe ser mayor a 0");
  }

  let total = 0;
  for (const row of balancesByCurrency.values()) {
    if (row.currency === baseCurrency) {
      total += row.amountCents;
      continue;
    }
    total += convertCents(
      row.amountCents,
      row.currency,
      baseCurrency,
      rate.rateScaled,
      rate.scale,
      baseCurrency,
      rate.quoteCurrency,
    );
  }

  return { amountCents: total, currency: baseCurrency };
}

/** Persist UI "1 USD = X ARS" as scaled integer. */
export function arsPerUsdToRateScaled(
  arsPerUsd: number,
  scale: number = CONSOLIDATION_RATE_SCALE,
): number {
  if (!Number.isFinite(arsPerUsd) || arsPerUsd <= 0) {
    throw new InvalidConsolidationRateError();
  }
  return Math.round(arsPerUsd * scale);
}

export function rateScaledToArsPerUsd(
  rateScaled: number,
  scale: number = CONSOLIDATION_RATE_SCALE,
): number {
  if (scale <= 0) throw new InvalidConsolidationRateError();
  return rateScaled / scale;
}
