/**
 * Calendar-day helpers for SPEC-18 (ISO YYYY-MM-DD, UTC components).
 */

import type { DateOnly } from "./types";
import { InvalidRecurringDatesError } from "./errors";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/u;

export function isDateOnly(value: string): value is DateOnly {
  if (!ISO_DAY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function assertDateOnly(value: string): DateOnly {
  if (!isDateOnly(value)) {
    throw new InvalidRecurringDatesError(
      `Fecha inválida (esperado YYYY-MM-DD): ${value}`,
    );
  }
  return value;
}

export function parseDateOnly(value: DateOnly): {
  y: number;
  m: number;
  d: number;
} {
  const [y, m, d] = value.split("-").map(Number);
  return { y, m, d };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDateOnly(y: number, m: number, d: number): DateOnly {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Days in month (1-based month). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * SPEC-18 §4.2.2 — If `day` does not exist in the target month, clamp to the
 * last day of that month.
 */
export function clampToEndOfMonth(
  year: number,
  month: number,
  day: number,
): DateOnly {
  const dim = daysInMonth(year, month);
  return formatDateOnly(year, month, Math.min(day, dim));
}

export function addDays(date: DateOnly, days: number): DateOnly {
  const { y, m, d } = parseDateOnly(date);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return formatDateOnly(
    dt.getUTCFullYear(),
    dt.getUTCMonth() + 1,
    dt.getUTCDate(),
  );
}

export function compareDateOnly(a: DateOnly, b: DateOnly): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function dateOnlyFromUtcDate(date: Date): DateOnly {
  return formatDateOnly(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

/**
 * Today's calendar day in `timezone` as DateOnly (wall clock via Intl).
 */
export function todayDateOnly(now: Date, timezone: string): DateOnly {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) {
    throw new InvalidRecurringDatesError("No se pudo resolver la fecha de hoy");
  }
  return `${y}-${m}-${d}`;
}
