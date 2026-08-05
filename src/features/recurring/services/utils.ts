import "server-only";
import {
  InvalidRecurringDatesError,
  dateOnlyFromUtcDate,
  type RecurringRule,
} from "@/features/recurring/domain";

import type { RecurringRuleRecord } from "./require-recurring-membership";

/**
 * Parses a "YYYY-MM-DD" string into a UTC-midnight Date so Prisma stores the
 * date component deterministically regardless of the JS Date's local time.
 */
export function parseRecurringDate(raw: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(raw)) {
    throw new InvalidRecurringDatesError(
      `Fecha inválida (esperado YYYY-MM-DD): ${raw}`,
    );
  }
  const [y, m, d] = raw.split("-").map(Number);
  const utcMs = Date.UTC(y, m - 1, d);
  const date = new Date(utcMs);
  if (Number.isNaN(date.getTime())) {
    throw new InvalidRecurringDatesError(`Fecha inválida: ${raw}`);
  }
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== m ||
    date.getUTCDate() !== d
  ) {
    throw new InvalidRecurringDatesError(`Fecha inválida: ${raw}`);
  }
  return date;
}

/**
 * Converts a Prisma record into the pure domain `RecurringRule` shape used by
 * cadence / status / duplicate helpers.
 */
export function toDomainRule(rule: RecurringRuleRecord): RecurringRule {
  return {
    id: rule.id,
    workspaceId: rule.workspaceId,
    name: rule.name,
    type: rule.type,
    amountCents: rule.amountCents,
    currency: rule.currency,
    accountId: rule.accountId,
    counterpartyAccountId: rule.counterpartyAccountId,
    categoryId: rule.categoryId,
    description: rule.description,
    frequency: rule.frequency,
    startDate: dateOnlyFromUtcDate(rule.startDate),
    endDate: rule.endDate ? dateOnlyFromUtcDate(rule.endDate) : null,
    status: rule.status,
    pausedReason: rule.pausedReason,
    createdByUserId: rule.createdByUserId,
    endedAt: rule.endedAt,
  };
}
