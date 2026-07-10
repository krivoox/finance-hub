/** Display-only money formatting. Amounts are integer cents. */

export function formatMoney(
  cents: number,
  currency: string = "ARS",
  locale: string = "es-AR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatSignedMoney(
  cents: number,
  currency: string = "ARS",
  locale: string = "es-AR"
): string {
  const formatted = formatMoney(Math.abs(cents), currency, locale);
  if (cents > 0) return `+${formatted}`;
  if (cents < 0) return `−${formatted}`;
  return formatted;
}
