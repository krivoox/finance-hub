/**
 * Amount field parsing for forms (KRI-33).
 *
 * Display and typing use a single decimal separator: **comma** (`es-AR`).
 * Period is accepted on parse/normalize so iOS (comma pad) and Android/US
 * (period pad) produce the same cents. No thousands grouping while typing;
 * paste of mixed `1.234,56` / `1,234.56` treats the last separator as decimal.
 */

export const AMOUNT_DECIMAL_SEPARATOR = "," as const;

export type ParseAmountOptions = {
  /** When true, `0` / `0,00` parse as 0 instead of null. */
  allowZero?: boolean;
  /** When true, a leading minus is kept (asset overdraft targets, SPEC-22). */
  allowNegative?: boolean;
};

export type NormalizeDecimalOptions = {
  maxFractionDigits?: number;
  allowNegative?: boolean;
};

function stripNonDecimalChars(raw: string): string {
  return raw.replace(/[^\d.,]/g, "");
}

function splitDecimalParts(cleaned: string): {
  intPart: string;
  fracPart: string;
  hasSeparator: boolean;
} {
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;

  if (hasComma && hasDot) {
    const decimalIndex = Math.max(lastComma, lastDot);
    return {
      intPart: cleaned.slice(0, decimalIndex).replace(/[.,]/g, ""),
      fracPart: cleaned.slice(decimalIndex + 1).replace(/[.,]/g, ""),
      hasSeparator: true,
    };
  }

  const sepChar = hasComma ? "," : hasDot ? "." : null;
  if (sepChar === null) {
    return { intPart: cleaned, fracPart: "", hasSeparator: false };
  }

  // First separator is the decimal: extra taps on the same key become fraction digits.
  const sep = cleaned.indexOf(sepChar);
  return {
    intPart: cleaned.slice(0, sep).replace(/[.,]/g, ""),
    fracPart: cleaned.slice(sep + 1).replace(/[.,]/g, ""),
    hasSeparator: true,
  };
}

/**
 * Sanitize a live amount/rate keystroke: digits + at most one comma,
 * optional fraction length (2 for money).
 */
export function normalizeDecimalInput(
  raw: string,
  options: NormalizeDecimalOptions = {},
): string {
  const maxFractionDigits = options.maxFractionDigits ?? 2;
  const allowNegative = options.allowNegative ?? false;
  const negative = allowNegative && /^\s*-/.test(raw);
  const cleaned = stripNonDecimalChars(raw);
  if (!cleaned) return negative ? "-" : "";

  const { intPart, fracPart, hasSeparator } = splitDecimalParts(cleaned);
  const clippedFrac = fracPart.slice(0, maxFractionDigits);

  const unsigned = hasSeparator
    ? `${intPart},${clippedFrac}`
    : intPart;
  return negative ? `-${unsigned}` : unsigned;
}

function canonicalUnsignedDecimal(raw: string): {
  intPart: string;
  fracPart: string;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("-")) return null;

  const cleaned = stripNonDecimalChars(trimmed);
  if (!cleaned) return null;

  const { intPart, fracPart, hasSeparator } = splitDecimalParts(cleaned);
  if (!hasSeparator && intPart === "") return null;
  if (hasSeparator && intPart === "" && fracPart === "") return null;

  return { intPart: intPart || "0", fracPart };
}

/**
 * Parse a monetary string into integer cents. Comma or period is decimal.
 * Returns null when empty, invalid, negative, or (by default) zero.
 */
export function parseAmountCents(
  raw: string,
  options: ParseAmountOptions = {},
): number | null {
  const trimmed = raw.trim();
  const negative = trimmed.startsWith("-");
  if (negative && !options.allowNegative) return null;

  const unsignedRaw = negative ? trimmed.slice(1) : trimmed;
  const parts = canonicalUnsignedDecimal(unsignedRaw);
  if (!parts) return null;

  const { intPart, fracPart } = parts;
  if (!/^\d+$/.test(intPart)) return null;

  const padded = `${fracPart}00`;
  const centsFromFrac = Number(padded.slice(0, 2));
  if (!Number.isInteger(centsFromFrac)) return null;

  const whole = Number(intPart);
  if (!Number.isFinite(whole) || !Number.isInteger(whole)) return null;

  let cents = whole * 100 + centsFromFrac;
  const third = fracPart[2];
  if (third !== undefined && Number(third) >= 5) {
    cents += 1;
  }

  if (!Number.isInteger(cents) || cents < 0) return null;
  if (cents === 0) {
    if (!options.allowZero) return null;
    return 0;
  }
  return negative ? -cents : cents;
}

/**
 * Parse a non-monetary decimal (FX rate, markup %) using comma or period.
 */
export function parseDecimalNumber(
  raw: string,
  options: ParseAmountOptions = {},
): number | null {
  const parts = canonicalUnsignedDecimal(raw);
  if (!parts) return null;

  const canonical = parts.fracPart
    ? `${parts.intPart}.${parts.fracPart}`
    : parts.intPart;
  const value = Number(canonical);
  if (!Number.isFinite(value) || value < 0) return null;
  if (value === 0 && !options.allowZero) return null;
  return value;
}

/** Format integer cents for an amount input (`12,50`). */
export function formatCentsAsAmountInput(cents: number): string {
  if (!Number.isFinite(cents) || !Number.isInteger(cents)) {
    return "";
  }
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole},${frac}`;
}

/** Format a JS number for a decimal input using comma. */
export function formatDecimalInput(
  value: number,
  maxFractionDigits = 2,
): string {
  if (!Number.isFinite(value)) return "";
  return normalizeDecimalInput(value.toFixed(maxFractionDigits), {
    maxFractionDigits,
  });
}
