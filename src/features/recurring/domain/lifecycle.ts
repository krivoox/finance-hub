/**
 * SPEC-18 §4.4 / §4.7 — Lifecycle transitions (pure).
 */

import { compareDateOnly } from "./date-only";
import {
  RecurringRuleEndedError,
  RecurringRuleNotActiveError,
  RecurringRuleNotPausedError,
} from "./errors";
import type {
  DateOnly,
  RecurringPausedReason,
  RecurringRule,
  RecurringRuleStatus,
} from "./types";

export function shouldAutoPauseOnAccountArchive(
  rule: Pick<
    RecurringRule,
    "status" | "accountId" | "counterpartyAccountId"
  >,
  archivedAccountId: string,
): boolean {
  if (rule.status !== "active") return false;
  return (
    rule.accountId === archivedAccountId ||
    rule.counterpartyAccountId === archivedAccountId
  );
}

export function applyAutoPause<T extends { status: RecurringRuleStatus; pausedReason: RecurringPausedReason | null }>(
  rule: T,
  reason: RecurringPausedReason = "account_archived",
): T {
  return {
    ...rule,
    status: "paused",
    pausedReason: reason,
  };
}

export function assertCanPause(
  rule: Pick<RecurringRule, "status">,
): void {
  if (rule.status === "ended") {
    throw new RecurringRuleEndedError();
  }
  if (rule.status !== "active") {
    throw new RecurringRuleNotActiveError();
  }
}

export function canResume(
  rule: Pick<RecurringRule, "status" | "endDate">,
  today: DateOnly,
): true {
  if (rule.status === "ended") {
    throw new RecurringRuleEndedError();
  }
  if (rule.status !== "paused") {
    throw new RecurringRuleNotPausedError();
  }
  if (rule.endDate && compareDateOnly(rule.endDate, today) < 0) {
    throw new RecurringRuleEndedError(
      "La recurrente ya alcanzó su fecha de fin",
    );
  }
  return true;
}

export function assertCanEnd(rule: Pick<RecurringRule, "status">): void {
  if (rule.status === "ended") {
    throw new RecurringRuleEndedError("La recurrente ya está finalizada");
  }
}
