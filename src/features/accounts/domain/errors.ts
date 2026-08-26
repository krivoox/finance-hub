/**
 * Typed domain errors for the Accounts feature (SPEC-03).
 *
 * Services and Server Actions catch `AccountDomainError` and translate the
 * message to a user-facing string.
 */

export class AccountDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountDomainError";
  }
}

/** @deprecated Prefer UnsupportedAccountCurrencyError (ADR-006). Kept for message shape. */
export class AccountCurrencyMismatchError extends AccountDomainError {
  constructor(accountCurrency: string, workspaceBaseCurrency: string) {
    super(
      `Account currency ${accountCurrency} does not match workspace base currency ${workspaceBaseCurrency}`,
    );
    this.name = "AccountCurrencyMismatchError";
  }
}

export class UnsupportedAccountCurrencyError extends AccountDomainError {
  constructor(currency: string) {
    super(
      `Account currency "${currency}" is not supported. Allowed: ARS, USD.`,
    );
    this.name = "UnsupportedAccountCurrencyError";
  }
}

export class AccountArchivedError extends AccountDomainError {
  constructor() {
    super("Account is archived and cannot accept new transactions");
    this.name = "AccountArchivedError";
  }
}

export class InvalidAccountNameError extends AccountDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAccountNameError";
  }
}

export class InvalidCreditLimitError extends AccountDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCreditLimitError";
  }
}

export class InvalidInitialBalanceError extends AccountDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInitialBalanceError";
  }
}

export class AccountNotFoundError extends AccountDomainError {
  constructor(accountId: string) {
    super(`Account ${accountId} not found`);
    this.name = "AccountNotFoundError";
  }
}

/** SPEC-03 §5.3 / §5.4 — Goal `status=active` with `linkedAccountId` blocks archive/delete. */
export class AccountLinkedToActiveGoalError extends AccountDomainError {
  constructor() {
    super(
      "La cuenta está vinculada a un objetivo activo. Cancelá o completá el objetivo antes de archivar o eliminar.",
    );
    this.name = "AccountLinkedToActiveGoalError";
  }
}

/** SPEC-03 §5.4 — Hard-delete of the only non-archived account is blocked. */
export class CannotDeleteLastActiveAccountError extends AccountDomainError {
  constructor() {
    super(
      "No podés eliminar la única cuenta activa. Archivá esta cuenta o creá otra antes de eliminarla.",
    );
    this.name = "CannotDeleteLastActiveAccountError";
  }
}

/** SPEC-03 §6 — UI type-to-confirm name does not match account name. */
export class AccountDeleteConfirmationMismatchError extends AccountDomainError {
  constructor() {
    super("El nombre no coincide. Escribí el nombre exacto de la cuenta.");
    this.name = "AccountDeleteConfirmationMismatchError";
  }
}
