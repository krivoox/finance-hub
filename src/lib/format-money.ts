/** Display-only money formatting. Amounts are integer cents. */

/**
 * Formats cents with ISO currency **code** (ARS / USD) to avoid `$` ambiguity
 * in Argentina (ADR-006).
 */
export function formatMoney(
  cents: number,
  currency: string,
  locale: string = "es-AR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatSignedMoney(
  cents: number,
  currency: string,
  locale: string = "es-AR",
): string {
  const formatted = formatMoney(Math.abs(cents), currency, locale);
  if (cents > 0) return `+${formatted}`;
  if (cents < 0) return `−${formatted}`;
  return formatted;
}

export type FormatFittedMoneyOptions = {
  locale?: string;
  /** Switch to compact notation when the full string exceeds this length. */
  maxChars?: number;
};

/**
 * Full currency format when it fits; compact (`4,4 M`) when a long amount
 * would overflow a tight hole (donut center, KRI-34).
 */
export function formatFittedMoney(
  cents: number,
  currency: string,
  options: FormatFittedMoneyOptions = {},
): string {
  const locale = options.locale ?? "es-AR";
  const maxChars = options.maxChars ?? 14;
  const full = formatMoney(cents, currency, locale);
  if (full.length <= maxChars) return full;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}
