/**
 * SPEC-18 §4.3 — Occurrence status classification.
 */

import { addDays, compareDateOnly } from "./date-only";
import {
  PREVIEW_HORIZON_DAYS,
  type DateOnly,
  type OccurrenceStatus,
} from "./types";

export function classifyOccurrence(
  scheduledOn: DateOnly,
  today: DateOnly,
  horizonDays: number = PREVIEW_HORIZON_DAYS,
  materializedOn: ReadonlySet<DateOnly>,
): OccurrenceStatus {
  if (materializedOn.has(scheduledOn)) {
    return "materialized";
  }
  const cmp = compareDateOnly(scheduledOn, today);
  if (cmp < 0) return "pending_past";
  if (cmp === 0) return "pending_today";
  const horizonEnd = addDays(today, horizonDays);
  if (compareDateOnly(scheduledOn, horizonEnd) <= 0) {
    return "pending_upcoming";
  }
  return "pending_future";
}

/** Statuses shown in the recurring tray (SPEC-18 §4.3). */
export const TRAY_STATUSES: ReadonlySet<OccurrenceStatus> = new Set([
  "pending_past",
  "pending_today",
  "pending_upcoming",
]);

/** Statuses shown on the dashboard widget. */
export const DASHBOARD_STATUSES: ReadonlySet<OccurrenceStatus> = new Set([
  "pending_today",
  "pending_upcoming",
]);
