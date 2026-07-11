import "server-only";
import { BudgetDomainError } from "@/features/budgets/domain";

/**
 * Parses a "YYYY-MM-DD" string into a UTC-midnight Date. Mirrors
 * `parseOccurredOn` in the transactions services so `Budget.startDate` /
 * `endDate` round-trip cleanly with Prisma's `@db.Date` columns.
 */
export function parseBudgetDate(raw: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(raw)) {
    throw new BudgetDomainError("Formato de fecha inválido (YYYY-MM-DD)");
  }
  const [y, m, d] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== m ||
    date.getUTCDate() !== d
  ) {
    throw new BudgetDomainError("Fecha inválida");
  }
  return date;
}
