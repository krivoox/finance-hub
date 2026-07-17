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
