import { todayDateOnly } from "@/features/recurring/domain/date-only";
import { USD_QUOTE_MAX_AGE_MS, USD_QUOTE_TZ } from "./types";

/**
 * SPEC-19 §4.4 / T-06…T-08.
 *
 * Stale when calendar day (AR) is behind today, or fetchedAt older than maxAge.
 */
export function isQuoteSnapshotStale(input: {
  asOfDate: string;
  fetchedAt: Date;
  now: Date;
  timeZone?: string;
  maxAgeMs?: number;
}): boolean {
  const timeZone = input.timeZone ?? USD_QUOTE_TZ;
  const maxAgeMs = input.maxAgeMs ?? USD_QUOTE_MAX_AGE_MS;
  const today = todayDateOnly(input.now, timeZone);

  if (input.asOfDate < today) return true;

  const age = input.now.getTime() - input.fetchedAt.getTime();
  if (age > maxAgeMs) return true;

  return false;
}
