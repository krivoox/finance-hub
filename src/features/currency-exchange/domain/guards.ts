/**
 * Pure currency-exchange invariants (SPEC-16 §4).
 */

import {
  ACCOUNT_CURRENCIES,
  isAccountCurrency,
  type AccountCurrency,
} from "@/domain/money/currencies";
import {
  InvalidExchangeAmountError,
  SameAccountExchangeError,
  SameCurrencyExchangeError,
  UnsupportedExchangeCurrencyError,
} from "./errors";

/** Scale for implied rate display: toCents * scale / fromCents. */
export const IMPLIED_RATE_SCALE = 1_000_000;

export type AssertValidCurrencyExchangeInput = {
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly fromCurrency: string;
  readonly toCurrency: string;
  readonly fromCents: number;
  readonly toCents: number;
};

/**
 * SPEC-16 FR-02 / T-02 — Distinct accounts, distinct allowed currencies,
 * positive integer amounts.
 */
export function assertValidCurrencyExchange(
  input: AssertValidCurrencyExchangeInput,
): void {
  if (input.fromAccountId === input.toAccountId) {
    throw new SameAccountExchangeError();
  }

  if (!isAccountCurrency(input.fromCurrency)) {
    throw new UnsupportedExchangeCurrencyError(input.fromCurrency);
  }
  if (!isAccountCurrency(input.toCurrency)) {
    throw new UnsupportedExchangeCurrencyError(input.toCurrency);
  }

  if (input.fromCurrency === input.toCurrency) {
    throw new SameCurrencyExchangeError();
  }

  assertPositiveExchangeAmount(input.fromCents, "origen");
  assertPositiveExchangeAmount(input.toCents, "destino");
}

function assertPositiveExchangeAmount(cents: number, label: string): void {
  if (!Number.isFinite(cents) || !Number.isInteger(cents)) {
    throw new InvalidExchangeAmountError(
      `El monto de ${label} debe ser un entero en centavos`,
    );
  }
  if (cents <= 0) {
    throw new InvalidExchangeAmountError(
      `El monto de ${label} debe ser mayor a 0`,
    );
  }
}

/**
 * Implied TC: how many `to` major-units per 1 `from` major-unit, scaled.
 * Both amounts are cents; the ratio of cents equals the ratio of majors.
 *
 * Example: 1_000_000 ARS cents → 70_000 USD cents →
 *   impliedRateScaled = 70_000 * 1e6 / 1_000_000 = 70_000
 *   → 0.07 USD per 1 ARS (or display as 1 / 0.07 ≈ 14.28 ARS per USD).
 */
export function impliedRateScaled(
  fromCents: number,
  toCents: number,
  scale: number = IMPLIED_RATE_SCALE,
): number {
  if (
    !Number.isFinite(fromCents) ||
    !Number.isFinite(toCents) ||
    fromCents <= 0 ||
    toCents <= 0 ||
    scale <= 0
  ) {
    throw new InvalidExchangeAmountError(
      "No se puede calcular el TC con montos inválidos",
    );
  }
  return Math.round((toCents * scale) / fromCents);
}

export function formatImpliedRateCaption(
  fromCurrency: AccountCurrency,
  toCurrency: AccountCurrency,
  fromCents: number,
  toCents: number,
): string {
  const fromMajor = fromCents / 100;
  const toMajor = toCents / 100;
  const rate = toMajor / fromMajor;
  if (fromCurrency === "ARS" && toCurrency === "USD") {
    const arsPerUsd = fromMajor / toMajor;
    return `1 USD ≈ ${formatRateNumber(arsPerUsd)} ARS`;
  }
  if (fromCurrency === "USD" && toCurrency === "ARS") {
    return `1 USD ≈ ${formatRateNumber(rate)} ARS`;
  }
  return `1 ${fromCurrency} ≈ ${formatRateNumber(rate)} ${toCurrency}`;
}

function formatRateNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-AR", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
}

export { ACCOUNT_CURRENCIES };
