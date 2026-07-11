/**
 * Typed domain errors for the Goals feature (SPEC-08).
 *
 * Services and Server Actions catch `GoalDomainError` and translate the
 * message to a user-facing string.
 */

export class GoalDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoalDomainError";
  }
}

export class InvalidContributionAmountError extends GoalDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidContributionAmountError";
  }
}

export class InvalidTargetAmountError extends GoalDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTargetAmountError";
  }
}

export class InvalidGoalNameError extends GoalDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGoalNameError";
  }
}

/**
 * SPEC-08 T-04 — Contributions are only accepted while the goal is `active`.
 * Both cancelled and completed goals reject new contributions.
 */
export class GoalNotActiveError extends GoalDomainError {
  constructor(message = "El objetivo no está activo") {
    super(message);
    this.name = "GoalNotActiveError";
  }
}

export class GoalNotFoundError extends GoalDomainError {
  constructor(goalId: string) {
    super(`Objetivo ${goalId} no encontrado`);
    this.name = "GoalNotFoundError";
  }
}

export class GoalCurrencyMismatchError extends GoalDomainError {
  constructor(goalCurrency: string, workspaceBaseCurrency: string) {
    super(
      `La moneda del objetivo (${goalCurrency}) no coincide con la del workspace (${workspaceBaseCurrency})`,
    );
    this.name = "GoalCurrencyMismatchError";
  }
}

export class GoalLinkedAccountInvalidError extends GoalDomainError {
  constructor(message: string) {
    super(message);
    this.name = "GoalLinkedAccountInvalidError";
  }
}
