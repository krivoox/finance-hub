/**
 * SPEC-18 §4.2 — Pure occurrence projection.
 */

import {
  addDays,
  clampToEndOfMonth,
  compareDateOnly,
  parseDateOnly,
} from "./date-only";
import type { DateOnly, RecurringRule } from "./types";

function occurrenceAt(
  startDate: DateOnly,
  frequency: RecurringRule["frequency"],
  n: number,
): DateOnly {
  if (n < 0) {
    throw new RangeError("n must be >= 0");
  }
  if (frequency === "weekly") {
    return addDays(startDate, 7 * n);
  }
  if (frequency === "biweekly") {
    return addDays(startDate, 14 * n);
  }
  const { y, m, d } = parseDateOnly(startDate);
  if (frequency === "monthly") {
    const totalMonths = m - 1 + n;
    const year = y + Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    return clampToEndOfMonth(year, month, d);
  }
  // yearly
  return clampToEndOfMonth(y + n, m, d);
}

/**
 * Returns scheduled dates in `[windowFrom, windowTo]` (inclusive), ascending.
 * Paused / ended rules project nothing (SPEC-18 T-07).
 */
export function computeOccurrences(
  rule: Pick<
    RecurringRule,
    "frequency" | "startDate" | "endDate" | "status"
  >,
  windowFrom: DateOnly,
  windowTo: DateOnly,
  _now?: DateOnly,
): DateOnly[] {
  void _now;
  if (rule.status !== "active") {
    return [];
  }
  if (compareDateOnly(windowFrom, windowTo) > 0) {
    return [];
  }

  const out: DateOnly[] = [];
  // Cap iterations: weekly worst-case ~366 days / 7 ≈ 53; monthly ~12; yearly ~few.
  // Use a hard safety cap for malformed windows.
  const MAX_N = 600;
  for (let n = 0; n < MAX_N; n++) {
    const scheduled = occurrenceAt(rule.startDate, rule.frequency, n);
    if (rule.endDate && compareDateOnly(scheduled, rule.endDate) > 0) {
      break;
    }
    if (compareDateOnly(scheduled, windowTo) > 0) {
      break;
    }
    if (compareDateOnly(scheduled, windowFrom) >= 0) {
      out.push(scheduled);
    }
  }
  return out;
}

/**
 * True when `scheduledOn` is an occurrence of the rule (ignoring status —
 * used to validate materialize of past occurrences on paused-manual rules).
 */
export function isScheduledOccurrence(
  rule: Pick<RecurringRule, "frequency" | "startDate" | "endDate">,
  scheduledOn: DateOnly,
): boolean {
  if (rule.endDate && compareDateOnly(scheduledOn, rule.endDate) > 0) {
    return false;
  }
  if (compareDateOnly(scheduledOn, rule.startDate) < 0) {
    return false;
  }
  // Search in a window that includes scheduledOn
  const hits = computeOccurrences(
    { ...rule, status: "active" },
    scheduledOn,
    scheduledOn,
  );
  return hits.includes(scheduledOn);
}

export { clampToEndOfMonth };
