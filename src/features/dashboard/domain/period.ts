/**
 * SPEC-12 FR-04 — Current calendar month period in the user's timezone.
 *
 * `Transaction.occurredOn` is stored in Postgres as `@db.Date` and read back
 * by Prisma as a UTC-midnight `Date`. To make the two comparable we project
 * the month boundaries onto UTC-midnight of the 1st of the month (in the
 * caller's timezone) and the 1st of the next month.
 *
 * Example:
 *   now = 2026-08-01T02:00:00Z, timezone = "America/Argentina/Buenos_Aires"
 *   → local wall clock is 2026-07-31 23:00, so "current month" is July 2026.
 *     start = 2026-07-01T00:00Z, end = 2026-08-01T00:00Z.
 */

import { TZDate } from "@date-fns/tz";
import type { DashboardPeriod } from "./types";

export function getCurrentMonthPeriod(
  now: Date,
  timezone: string,
): DashboardPeriod {
  const localNow = new TZDate(now.getTime(), timezone);
  const year = localNow.getFullYear();
  const month = localNow.getMonth();
  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
  };
}
