/**
 * SPEC-18 §4.6 — Materialization helpers (pure).
 */

import { addDays, compareDateOnly } from "./date-only";
import { isScheduledOccurrence } from "./cadence";
import {
  AlreadyMaterializedError,
  CannotMaterializeRuleError,
  NotAScheduledOccurrenceError,
  RecurringRuleEndedError,
  TooEarlyToMaterializeError,
} from "./errors";
import type { DateOnly, RecurringRule } from "./types";

/**
 * Asserts the (ruleId, scheduledOn) pair has not been materialized yet.
 */
export function assertNotAlreadyMaterialized(
  _ruleId: string,
  scheduledOn: DateOnly,
  existingScheduled: ReadonlySet<DateOnly>,
  existingTransactionId: string | null = null,
): void {
  if (existingScheduled.has(scheduledOn)) {
    throw new AlreadyMaterializedError(undefined, existingTransactionId);
  }
}

/**
 * Whether an occurrence date is already inside the confirmation window
 * (`date ≤ today + 1`, SPEC-18 §4.6.1). Same rule `resolveOccurredOn` enforces,
 * exposed as a predicate so the UI can hide the action instead of failing.
 */
export function canMaterializeOn(date: DateOnly, today: DateOnly): boolean {
  return compareDateOnly(date, addDays(today, 1)) <= 0;
}

/**
 * Resolves accounting date for materialization (SPEC-18 §4.6.1).
 * Override path still enforces `occurredOn ≤ today + 1`.
 */
export function resolveOccurredOn(
  scheduledOn: DateOnly,
  today: DateOnly,
  override?: DateOnly,
): DateOnly {
  const target = override ?? scheduledOn;
  if (!canMaterializeOn(target, today)) {
    throw new TooEarlyToMaterializeError();
  }
  return target;
}

/**
 * Whether the rule status allows materializing an occurrence (SPEC-18 T-29/T-30).
 * - active: yes
 * - paused + manual: yes (catch up)
 * - paused + account_archived: no (accounts blocked separately)
 * - ended: no
 */
export function assertCanMaterializeRule(rule: Pick<
  RecurringRule,
  "status" | "pausedReason"
>): void {
  if (rule.status === "ended") {
    throw new RecurringRuleEndedError();
  }
  if (rule.status === "paused" && rule.pausedReason === "account_archived") {
    throw new CannotMaterializeRuleError(
      "La recurrente está pausada porque la cuenta fue archivada",
    );
  }
  if (rule.status === "paused" && rule.pausedReason !== "manual") {
    throw new CannotMaterializeRuleError();
  }
  // active or paused-manual OK
}

export function assertIsScheduledOccurrence(
  rule: Pick<RecurringRule, "frequency" | "startDate" | "endDate">,
  scheduledOn: DateOnly,
): void {
  if (!isScheduledOccurrence(rule, scheduledOn)) {
    throw new NotAScheduledOccurrenceError();
  }
}
