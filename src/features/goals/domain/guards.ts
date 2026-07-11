/**
 * Pure goal invariants used by services and Server Actions (SPEC-08 §4).
 *
 * Every rule here is pure and side-effect free so it drives Vitest TDD for
 * the T-01..T-05 scenarios in the spec.
 */

import {
  GoalCurrencyMismatchError,
  GoalNotActiveError,
  InvalidContributionAmountError,
  InvalidGoalNameError,
  InvalidTargetAmountError,
} from "./errors";
import type { GoalStatus } from "./types";

export const GOAL_NAME_MAX_LENGTH = 80;

// ---------------------------------------------------------------------------
// Name
// ---------------------------------------------------------------------------

/**
 * Trims and collapses internal whitespace. Returns the empty string when the
 * input has no visible characters — callers must validate emptiness separately.
 */
export function normalizeGoalName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * SPEC-08 §4 — Goal name must be non-empty (after trimming) and at most
 * `GOAL_NAME_MAX_LENGTH` characters.
 */
export function assertValidGoalName(name: string): void {
  if (typeof name !== "string") {
    throw new InvalidGoalNameError("El nombre del objetivo debe ser texto");
  }
  const normalized = normalizeGoalName(name);
  if (normalized.length === 0) {
    throw new InvalidGoalNameError("El nombre del objetivo es obligatorio");
  }
  if (normalized.length > GOAL_NAME_MAX_LENGTH) {
    throw new InvalidGoalNameError(
      `El nombre debe tener ${GOAL_NAME_MAX_LENGTH} caracteres o menos`,
    );
  }
}

// ---------------------------------------------------------------------------
// Amounts
// ---------------------------------------------------------------------------

/**
 * SPEC-08 §4 — `targetAmount > 0`, integer cents (ADR-001).
 */
export function assertValidTargetAmount(amountCents: number): void {
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
    throw new InvalidTargetAmountError(
      "El monto objetivo debe ser un entero en centavos",
    );
  }
  if (amountCents <= 0) {
    throw new InvalidTargetAmountError("El monto objetivo debe ser mayor a 0");
  }
}

/**
 * SPEC-08 T-05 — Contributions must be strictly positive integer cents.
 */
export function assertValidContribution(amountCents: number): void {
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
    throw new InvalidContributionAmountError(
      "El aporte debe ser un entero en centavos",
    );
  }
  if (amountCents <= 0) {
    throw new InvalidContributionAmountError("El aporte debe ser mayor a 0");
  }
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

/**
 * SPEC-08 T-04 / FR-05 — Only active goals accept new contributions. Both
 * `cancelled` and `completed` goals reject them (the completed transition
 * happens automatically inside `applyContribution`).
 */
export function assertCanContribute(status: GoalStatus): void {
  if (status !== "active") {
    throw new GoalNotActiveError();
  }
}

export type ApplyContributionInput = {
  readonly currentAmountCents: number;
  readonly targetAmountCents: number;
  readonly status: GoalStatus;
};

export type ApplyContributionResult = {
  readonly newCurrentAmountCents: number;
  readonly newStatus: GoalStatus;
};

/**
 * SPEC-08 FR-02 / FR-04 — Advance the goal's current amount and auto-complete
 * when `currentAmount >= targetAmount`. Overflow (contribution beyond target)
 * is accepted per SPEC-08 §4 (excess is not rejected in MVP).
 *
 * Pure: does not touch Postgres. Callers persist `newCurrentAmountCents` and
 * `newStatus` inside a transaction.
 */
export function applyContribution(
  goal: ApplyContributionInput,
  amountCents: number,
): ApplyContributionResult {
  assertValidContribution(amountCents);
  assertCanContribute(goal.status);

  const newCurrentAmountCents = goal.currentAmountCents + amountCents;
  const newStatus: GoalStatus =
    newCurrentAmountCents >= goal.targetAmountCents ? "completed" : "active";

  return { newCurrentAmountCents, newStatus };
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/**
 * SPEC-08 FR-03 — Progress percentage for display. Returns an integer
 * 0..100. Values above 100 are capped for display (over-funded goals still
 * report 100% in the UI, but `currentAmount` stays authoritative).
 *
 * Defensive: returns 0 when `targetCents <= 0` (shouldn't happen for
 * persisted goals since `assertValidTargetAmount` runs on create).
 */
export function progressPercent(
  currentCents: number,
  targetCents: number,
): number {
  if (
    !Number.isFinite(currentCents) ||
    !Number.isFinite(targetCents) ||
    targetCents <= 0
  ) {
    return 0;
  }
  const raw = Math.floor((currentCents / targetCents) * 100);
  if (raw < 0) return 0;
  if (raw > 100) return 100;
  return raw;
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

/**
 * SPEC-08 §4 (MVP: no FX) — A goal's currency must match the workspace's
 * baseCurrency.
 */
export function assertGoalCurrencyMatchesWorkspace(
  goalCurrency: string,
  workspaceBaseCurrency: string,
): void {
  if (goalCurrency !== workspaceBaseCurrency) {
    throw new GoalCurrencyMismatchError(goalCurrency, workspaceBaseCurrency);
  }
}
