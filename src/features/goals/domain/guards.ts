/**
 * Pure goal invariants used by services and Server Actions (SPEC-08 §4).
 *
 * Every rule here is pure and side-effect free so it drives Vitest TDD for
 * the T-01..T-05 scenarios in the spec.
 */

import {
  GoalCurrencyMismatchError,
  GoalDeleteConfirmationMismatchError,
  GoalLinkedAccountInvalidError,
  GoalLinkedAccountRequiredError,
  GoalNotActiveError,
  GoalNotEditableError,
  InvalidContributionAmountError,
  InvalidGoalNameError,
  InvalidTargetAmountError,
} from "./errors";
import type { GoalStatus } from "./types";
import { isAccountCurrency } from "@/domain/money/currencies";
import {
  assertAccountActive,
  assertAccountBelongsToWorkspace,
  assertTransactionCurrencyMatchesAccount,
  assertTransferAccounts,
} from "@/features/transactions/domain";

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
  return Math.floor(progressFillPercent(currentCents, targetCents));
}

/**
 * SPEC-08 T-02b / FR-03 — Exact 0..100 ratio for the progress bar. Not
 * floored: a small contribution on a large target must still move the fill
 * (the integer label may stay at 0% until the next whole percent).
 */
export function progressFillPercent(
  currentCents: number,
  targetCents: number,
): number {
  if (
    !Number.isFinite(currentCents) ||
    !Number.isFinite(targetCents) ||
    targetCents <= 0 ||
    currentCents <= 0
  ) {
    return 0;
  }
  const raw = (currentCents / targetCents) * 100;
  if (raw > 100) return 100;
  return raw;
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

/**
 * SPEC-08 / ADR-006 — Goal currency must be ARS|USD (may differ from base).
 */
export function assertGoalCurrencyAllowed(goalCurrency: string): void {
  if (!isAccountCurrency(goalCurrency)) {
    throw new GoalCurrencyMismatchError(goalCurrency, "ARS|USD");
  }
}

/**
 * @deprecated Prefer assertGoalCurrencyAllowed (ADR-006).
 */
export function assertGoalCurrencyMatchesWorkspace(
  goalCurrency: string,
  _workspaceBaseCurrency: string,
): void {
  assertGoalCurrencyAllowed(goalCurrency);
}

// ---------------------------------------------------------------------------
// ContributeToGoal = transfer accounts (H4)
// ---------------------------------------------------------------------------

export type GoalContributionAccountLike = {
  readonly id: string;
  readonly workspaceId: string;
  readonly currency: string;
  readonly isArchived: boolean;
};

export type AssertGoalContributionTransferAccountsInput = {
  readonly goalWorkspaceId: string;
  readonly goalCurrency: string;
  readonly linkedAccountId: string | null;
  readonly fromAccountId: string;
  readonly fromAccount: GoalContributionAccountLike;
  readonly linkedAccount: GoalContributionAccountLike | null;
};

export type AssertGoalContributionTransferAccountsResult = {
  readonly fromAccountId: string;
  readonly toAccountId: string;
};

/**
 * SPEC-08 T-06 / T-08 / T-09 / T-10 / T-16 — Resolve transfer legs for a goal
 * contribution. Destination is always `linkedAccountId` (not chosen by user).
 *
 * Reuses transfer guards (same account, archived, workspace, currency).
 */
export function assertGoalContributionTransferAccounts(
  input: AssertGoalContributionTransferAccountsInput,
): AssertGoalContributionTransferAccountsResult {
  if (
    typeof input.linkedAccountId !== "string" ||
    input.linkedAccountId.length === 0
  ) {
    throw new GoalLinkedAccountRequiredError();
  }
  if (!input.linkedAccount) {
    throw new GoalLinkedAccountRequiredError(
      "La cuenta vinculada del objetivo no existe",
    );
  }

  assertTransferAccounts(input.fromAccountId, input.linkedAccountId);
  assertAccountBelongsToWorkspace(
    input.fromAccount.workspaceId,
    input.goalWorkspaceId,
  );
  assertAccountBelongsToWorkspace(
    input.linkedAccount.workspaceId,
    input.goalWorkspaceId,
  );
  assertAccountActive(input.fromAccount.isArchived);
  assertAccountActive(input.linkedAccount.isArchived);
  assertTransactionCurrencyMatchesAccount(
    input.fromAccount.currency,
    input.linkedAccount.currency,
  );
  assertTransactionCurrencyMatchesAccount(
    input.goalCurrency,
    input.fromAccount.currency,
  );

  return {
    fromAccountId: input.fromAccountId,
    toAccountId: input.linkedAccountId,
  };
}

// ---------------------------------------------------------------------------
// Reverse contribution on transfer delete (H4)
// ---------------------------------------------------------------------------

export type ReverseContributionInput = {
  readonly currentAmountCents: number;
  readonly targetAmountCents: number;
  readonly status: GoalStatus;
};

export type ReverseContributionResult = {
  readonly newCurrentAmountCents: number;
  readonly newStatus: GoalStatus;
};

/**
 * SPEC-08 T-13 / T-14 / §4.4 — Undo a contribution after its transfer is
 * deleted. Subtracts the amount and reopens `completed` → `active` when the
 * remaining current falls below target. Never reopens `cancelled`.
 */
export function reverseContribution(
  goal: ReverseContributionInput,
  amountCents: number,
): ReverseContributionResult {
  assertValidContribution(amountCents);

  const newCurrentAmountCents = Math.max(
    0,
    goal.currentAmountCents - amountCents,
  );

  if (goal.status === "cancelled") {
    return { newCurrentAmountCents, newStatus: "cancelled" };
  }

  const newStatus: GoalStatus =
    newCurrentAmountCents >= goal.targetAmountCents ? "completed" : "active";

  return { newCurrentAmountCents, newStatus };
}

// ---------------------------------------------------------------------------
// ABM — UpdateGoal / DeleteGoal (KRI-27)
// ---------------------------------------------------------------------------

/**
 * SPEC-08 T-18 — Cancelled goals are terminal for edits. Completed goals
 * remain editable (name / target / date / linked account).
 */
export function assertCanUpdateGoal(status: GoalStatus): void {
  if (status === "cancelled") {
    throw new GoalNotEditableError();
  }
}

export type ApplyGoalTargetChangeInput = {
  readonly currentAmountCents: number;
  readonly status: GoalStatus;
};

export type ApplyGoalTargetChangeResult = {
  readonly newStatus: GoalStatus;
};

/**
 * SPEC-08 T-17 — Recalculate status when the target amount changes.
 * Lowering the target to `<= current` completes; raising it above current
 * reopens a completed goal. Never touches `cancelled` (caller must
 * `assertCanUpdateGoal` first).
 */
export function applyGoalTargetChange(
  goal: ApplyGoalTargetChangeInput,
  newTargetAmountCents: number,
): ApplyGoalTargetChangeResult {
  assertValidTargetAmount(newTargetAmountCents);
  assertCanUpdateGoal(goal.status);

  if (goal.currentAmountCents >= newTargetAmountCents) {
    return { newStatus: "completed" };
  }
  return { newStatus: "active" };
}

export type GoalLinkedAccountLike = {
  readonly id: string;
  readonly workspaceId: string;
  readonly currency: string;
  readonly isArchived: boolean;
};

/**
 * SPEC-08 T-19 / FR-06 — Validate a candidate linked account for create
 * or update. Callers that pass `linkedAccountId=null` skip this (unlink).
 */
export function assertLinkedAccountForGoal(input: {
  readonly account: GoalLinkedAccountLike | null;
  readonly goalWorkspaceId: string;
  readonly goalCurrency: string;
}): void {
  if (!input.account) {
    throw new GoalLinkedAccountInvalidError("La cuenta vinculada no existe");
  }
  if (input.account.workspaceId !== input.goalWorkspaceId) {
    throw new GoalLinkedAccountInvalidError(
      "La cuenta vinculada pertenece a otro workspace",
    );
  }
  if (input.account.isArchived) {
    throw new GoalLinkedAccountInvalidError(
      "No podés vincular una cuenta archivada",
    );
  }
  if (input.account.currency !== input.goalCurrency) {
    throw new GoalLinkedAccountInvalidError(
      "La cuenta vinculada usa otra moneda",
    );
  }
}

/**
 * SPEC-08 T-20 — Strong confirmation: confirmName must match goal name (trim).
 */
export function assertDeleteGoalConfirmation(input: {
  readonly goalName: string;
  readonly confirmName: string;
}): void {
  if (input.confirmName.trim() !== input.goalName.trim()) {
    throw new GoalDeleteConfirmationMismatchError();
  }
}
