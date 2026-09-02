/**
 * Balance adjustment planning (SPEC-22 / KRI-36).
 *
 * The user supplies a target derived balance (or credit-card debt). This
 * module computes the ledger delta; it never mutates `initialBalance`.
 */

import { InvalidTargetBalanceError, NoAdjustmentNeededError } from "./errors";
import type { AccountType } from "./types";

export const ADJUSTMENT_LEDGER_TYPES = [
  "adjustment_credit",
  "adjustment_debit",
] as const;

export type AdjustmentLedgerType = (typeof ADJUSTMENT_LEDGER_TYPES)[number];

export type ComputeBalanceAdjustmentInput = {
  readonly currentBalanceCents: number;
  readonly targetBalanceCents: number;
  readonly accountType: AccountType;
};

export type BalanceAdjustmentPlan = {
  readonly amountCents: number;
  readonly ledgerType: AdjustmentLedgerType;
  readonly signedEffect: number;
};

export function isAdjustmentLedgerType(
  value: string,
): value is AdjustmentLedgerType {
  return (ADJUSTMENT_LEDGER_TYPES as readonly string[]).includes(value);
}

/**
 * SPEC-22 §6.2 — Derive the ledger type and positive amount that move
 * `currentBalance` to `targetBalance`.
 *
 * `signedEffect = target − current` is the change in the stored number
 * (asset balance or credit-card debt). Polaridad:
 *   asset          +N → credit, −N → debit
 *   credit_card    +N (más deuda) → debit, −N (menos deuda) → credit
 */
export function computeBalanceAdjustment(
  input: ComputeBalanceAdjustmentInput,
): BalanceAdjustmentPlan {
  const { currentBalanceCents, targetBalanceCents, accountType } = input;

  if (
    !Number.isSafeInteger(currentBalanceCents) ||
    !Number.isSafeInteger(targetBalanceCents)
  ) {
    throw new InvalidTargetBalanceError();
  }

  if (accountType === "credit_card" && targetBalanceCents < 0) {
    throw new InvalidTargetBalanceError(
      "La deuda de una tarjeta no puede ser negativa.",
    );
  }

  const signedEffect = targetBalanceCents - currentBalanceCents;
  if (signedEffect === 0) {
    throw new NoAdjustmentNeededError();
  }

  const amountCents = Math.abs(signedEffect);
  const isCreditCard = accountType === "credit_card";
  const ledgerType: AdjustmentLedgerType = isCreditCard
    ? signedEffect > 0
      ? "adjustment_debit"
      : "adjustment_credit"
    : signedEffect > 0
      ? "adjustment_credit"
      : "adjustment_debit";

  return { amountCents, ledgerType, signedEffect };
}
