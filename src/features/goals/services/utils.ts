import "server-only";
import { GoalDomainError } from "@/features/goals/domain";

/**
 * Parses a "YYYY-MM-DD" string into a UTC-midnight Date so Prisma stores the
 * date component deterministically regardless of the JS Date's local time.
 */
export function parseDateOnly(raw: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(raw)) {
    throw new GoalDomainError("Fecha inválida (esperado YYYY-MM-DD)");
  }
  const [y, m, d] = raw.split("-").map(Number);
  const utcMs = Date.UTC(y, m - 1, d);
  const date = new Date(utcMs);
  if (Number.isNaN(date.getTime())) {
    throw new GoalDomainError("Fecha inválida");
  }
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== m ||
    date.getUTCDate() !== d
  ) {
    throw new GoalDomainError("Fecha inválida");
  }
  return date;
}
