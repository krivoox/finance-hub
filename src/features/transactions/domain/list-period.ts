/**
 * SPEC-05 FR-04 — List period resolution (timezone-aware presets + custom).
 */

import {
  getCurrentMonthPeriod,
  getCurrentWeekPeriod,
  inclusiveIsoRangeFromHalfOpen,
} from "@/domain/calendar";

import { InvalidDateRangeError } from "./errors";

export const LIST_PAGE_SIZE = 25;

export const LIST_PERIODS = [
  "this_month",
  "this_week",
  "all",
  "custom",
] as const;

export type ListPeriod = (typeof LIST_PERIODS)[number];

export type ResolvedListPeriod =
  | { readonly kind: "unbounded" }
  | { readonly kind: "bounded"; readonly from: string; readonly to: string };

export type ResolveListPeriodInput = {
  readonly period?: string | null;
  readonly from?: string | null;
  readonly to?: string | null;
  readonly now: Date;
  readonly timezone: string;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/u;
const MAX_CUSTOM_RANGE_DAYS = 366;

export function isListPeriod(value: string): value is ListPeriod {
  return (LIST_PERIODS as readonly string[]).includes(value);
}

/** Absent or unknown period → `this_month` (SPEC-05 T-19). */
export function normalizeListPeriod(period?: string | null): ListPeriod {
  if (period && isListPeriod(period)) return period;
  return "this_month";
}

export function isIsoCalendarDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Inclusive calendar-day span between ISO dates (UTC). */
export function inclusiveDaySpan(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.floor((b - a) / 86_400_000) + 1;
}

function assertValidCustomRange(from: string, to: string): void {
  if (!isIsoCalendarDay(from) || !isIsoCalendarDay(to)) {
    throw new InvalidDateRangeError("Fechas custom inválidas (YYYY-MM-DD)");
  }
  if (from > to) {
    throw new InvalidDateRangeError("from no puede ser posterior a to");
  }
  if (inclusiveDaySpan(from, to) > MAX_CUSTOM_RANGE_DAYS) {
    throw new InvalidDateRangeError(
      `El rango inclusivo no puede superar ${MAX_CUSTOM_RANGE_DAYS} días`,
    );
  }
}

/**
 * Resolve list period presets / custom into a bounded ISO range or unbounded.
 * Throws `InvalidDateRangeError` for invalid custom (SPEC-05 T-12…T-14).
 */
export function resolveListPeriod(
  input: ResolveListPeriodInput,
): ResolvedListPeriod {
  const period = normalizeListPeriod(input.period);

  switch (period) {
    case "all":
      return { kind: "unbounded" };

    case "this_week": {
      const week = getCurrentWeekPeriod(input.now, input.timezone);
      const range = inclusiveIsoRangeFromHalfOpen(week);
      return { kind: "bounded", from: range.from, to: range.to };
    }

    case "custom": {
      const from = input.from ?? null;
      const to = input.to ?? null;
      if (!from || !to) {
        throw new InvalidDateRangeError(
          "period=custom requiere from y to",
        );
      }
      assertValidCustomRange(from, to);
      return { kind: "bounded", from, to };
    }

    case "this_month":
    default: {
      // Ignore URL from/to for non-custom presets (SPEC-05 T-15).
      const month = getCurrentMonthPeriod(input.now, input.timezone);
      const range = inclusiveIsoRangeFromHalfOpen(month);
      return { kind: "bounded", from: range.from, to: range.to };
    }
  }
}
