import "server-only";
import { InvalidOccurredOnError } from "@/features/transactions/domain";

/**
 * Parses a "YYYY-MM-DD" string into a UTC-midnight Date. Prisma's `@db.Date`
 * stores the date component regardless of the JS Date's time, but UTC midnight
 * keeps behavior deterministic across timezones.
 */
export function parseOccurredOn(raw: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(raw)) {
    throw new InvalidOccurredOnError();
  }
  const [y, m, d] = raw.split("-").map(Number);
  const utcMs = Date.UTC(y, m - 1, d);
  const date = new Date(utcMs);
  if (Number.isNaN(date.getTime())) {
    throw new InvalidOccurredOnError();
  }
  // Validate that the components round-trip (rejects 2026-02-30 etc.)
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== m ||
    date.getUTCDate() !== d
  ) {
    throw new InvalidOccurredOnError();
  }
  return date;
}
