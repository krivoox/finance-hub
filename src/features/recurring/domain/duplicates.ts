/**
 * SPEC-18 §4.8 — Duplicate detection heuristic (non-blocking).
 */

import { addDays, compareDateOnly } from "./date-only";
import {
  DUPLICATE_AMOUNT_TOLERANCE,
  DUPLICATE_DATE_WINDOW_DAYS,
  type DateOnly,
  type DuplicateCandidateTx,
  type RecurringRule,
} from "./types";

function amountInTolerance(
  candidate: number,
  expected: number,
  tolerance: number,
): boolean {
  const low = Math.round(expected * (1 - tolerance));
  const high = Math.round(expected * (1 + tolerance));
  return candidate >= low && candidate <= high;
}

/**
 * Returns txs that look similar to the upcoming materialization.
 * Does not block — UI may warn.
 */
export function findPossibleDuplicates(
  rule: Pick<
    RecurringRule,
    | "type"
    | "accountId"
    | "counterpartyAccountId"
    | "categoryId"
    | "amountCents"
  >,
  scheduledOn: DateOnly,
  recent: readonly DuplicateCandidateTx[],
  options?: {
    readonly amountTolerance?: number;
    readonly dateWindowDays?: number;
  },
): DuplicateCandidateTx[] {
  const tol = options?.amountTolerance ?? DUPLICATE_AMOUNT_TOLERANCE;
  const window = options?.dateWindowDays ?? DUPLICATE_DATE_WINDOW_DAYS;
  const from = addDays(scheduledOn, -window);
  const to = addDays(scheduledOn, window);

  return recent.filter((tx) => {
    if (tx.recurringRuleId != null) return false;
    if (tx.type !== rule.type) return false;
    if (tx.accountId !== rule.accountId) return false;
    if (rule.type === "transfer") {
      if (tx.counterpartyAccountId !== rule.counterpartyAccountId) return false;
    } else {
      if (tx.categoryId !== rule.categoryId) return false;
    }
    if (!amountInTolerance(tx.amountCents, rule.amountCents, tol)) return false;
    if (compareDateOnly(tx.occurredOn, from) < 0) return false;
    if (compareDateOnly(tx.occurredOn, to) > 0) return false;
    return true;
  });
}
