/**
 * SPEC-18 — Recurring rule types (pure domain).
 *
 * Calendar days are ISO `YYYY-MM-DD` strings (`DateOnly`) so arithmetic stays
 * timezone-agnostic; services convert to/from Prisma `@db.Date`.
 */

export type DateOnly = string;

export const RECURRING_FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
  "yearly",
] as const;

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export const RECURRING_RULE_TYPES = ["income", "expense", "transfer"] as const;

export type RecurringRuleType = (typeof RECURRING_RULE_TYPES)[number];

export const RECURRING_RULE_STATUSES = ["active", "paused", "ended"] as const;

export type RecurringRuleStatus = (typeof RECURRING_RULE_STATUSES)[number];

export const RECURRING_PAUSED_REASONS = ["manual", "account_archived"] as const;

export type RecurringPausedReason = (typeof RECURRING_PAUSED_REASONS)[number];

/** Domain snapshot of a RecurringRule (no Prisma). */
export type RecurringRule = {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly type: RecurringRuleType;
  readonly amountCents: number;
  readonly currency: string;
  readonly accountId: string;
  readonly counterpartyAccountId: string | null;
  readonly categoryId: string | null;
  readonly description: string | null;
  readonly frequency: RecurringFrequency;
  readonly startDate: DateOnly;
  readonly endDate: DateOnly | null;
  readonly status: RecurringRuleStatus;
  readonly pausedReason: RecurringPausedReason | null;
  readonly createdByUserId: string;
  readonly endedAt: Date | null;
};

export const PREVIEW_HORIZON_DAYS = 30;
export const DUPLICATE_AMOUNT_TOLERANCE = 0.1;
export const DUPLICATE_DATE_WINDOW_DAYS = 3;
export const RECURRING_NAME_MAX_LENGTH = 80;
export const RECURRING_DESCRIPTION_MAX_LENGTH = 200;

export type OccurrenceStatus =
  | "materialized"
  | "pending_past"
  | "pending_today"
  | "pending_upcoming"
  | "pending_future";

/** Minimal tx shape for duplicate heuristic (SPEC-18 §4.8). */
export type DuplicateCandidateTx = {
  readonly id: string;
  readonly type: RecurringRuleType;
  readonly accountId: string;
  readonly counterpartyAccountId: string | null;
  readonly categoryId: string | null;
  readonly amountCents: number;
  readonly occurredOn: DateOnly;
  readonly recurringRuleId: string | null;
};
