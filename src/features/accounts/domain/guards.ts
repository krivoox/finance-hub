/**
 * Pure account invariants used by services and Server Actions (SPEC-03 §5).
 */

import { isAccountCurrency } from "@/domain/money/currencies";
import {
  AccountArchivedError,
  AccountCurrencyMismatchError,
  AccountDeleteConfirmationMismatchError,
  AccountHasCrossWorkspaceLinksError,
  AccountLinkedToActiveGoalError,
  CannotDeleteLastActiveAccountError,
  InvalidAccountNameError,
  InvalidCreditLimitError,
  InvalidInitialBalanceError,
  UnsupportedAccountCurrencyError,
} from "./errors";
import type { AccountType } from "./types";

export {
  AccountArchivedError,
  AccountCurrencyMismatchError,
  AccountDeleteConfirmationMismatchError,
  AccountHasCrossWorkspaceLinksError,
  AccountLinkedToActiveGoalError,
  CannotDeleteLastActiveAccountError,
  InvalidAccountNameError,
  InvalidCreditLimitError,
  InvalidInitialBalanceError,
  UnsupportedAccountCurrencyError,
};

export const ACCOUNT_NAME_MAX_LENGTH = 80;

/**
 * SPEC-03 / ADR-006 — Account currency must be in ACCOUNT_CURRENCIES (ARS|USD).
 * May differ from workspace.baseCurrency.
 */
export function assertAccountCurrencyAllowed(accountCurrency: string): void {
  if (!isAccountCurrency(accountCurrency)) {
    throw new UnsupportedAccountCurrencyError(accountCurrency);
  }
}

/**
 * @deprecated Use assertAccountCurrencyAllowed (ADR-006). Kept for callers
 * that still pass baseCurrency during transition.
 */
export function assertCurrencyMatchesWorkspace(
  accountCurrency: string,
  _workspaceBaseCurrency: string,
): void {
  assertAccountCurrencyAllowed(accountCurrency);
}

/**
 * SPEC-03 FR-06 / T-04 — Archived accounts cannot receive new transactions.
 */
export function assertAccountAcceptsTransactions(account: {
  readonly isArchived: boolean;
}): void {
  if (account.isArchived) {
    throw new AccountArchivedError();
  }
}

/**
 * SPEC-03 §5 — Account name must be non-empty (after trimming) and at most
 * `ACCOUNT_NAME_MAX_LENGTH` characters.
 */
export function assertValidAccountName(name: string): void {
  if (typeof name !== "string") {
    throw new InvalidAccountNameError("Account name must be a string");
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new InvalidAccountNameError("Account name cannot be empty");
  }
  if (trimmed.length > ACCOUNT_NAME_MAX_LENGTH) {
    throw new InvalidAccountNameError(
      `Account name must be at most ${ACCOUNT_NAME_MAX_LENGTH} characters`,
    );
  }
}

/**
 * `initialBalanceCents` must be a non-negative integer (ADR-001). The direction
 * of a credit-card "starting debt" is expressed as a positive amount because
 * the credit-card balance IS the debt.
 */
export function assertValidInitialBalance(amountCents: number): void {
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
    throw new InvalidInitialBalanceError(
      "initialBalanceCents must be an integer",
    );
  }
  if (amountCents < 0) {
    throw new InvalidInitialBalanceError(
      "initialBalanceCents must be non-negative",
    );
  }
}

/**
 * Credit limits only make sense on credit cards; they must be positive integers
 * when provided. Omitted / null is allowed (including on credit_card — SPEC-03 T-06).
 */
export function assertValidCreditLimit(
  type: AccountType,
  creditLimitCents: number | null | undefined,
): void {
  if (creditLimitCents === undefined || creditLimitCents === null) return;

  if (type !== "credit_card") {
    throw new InvalidCreditLimitError(
      "creditLimit can only be set on credit_card accounts",
    );
  }
  if (!Number.isInteger(creditLimitCents) || creditLimitCents <= 0) {
    throw new InvalidCreditLimitError(
      "creditLimitCents must be a positive integer",
    );
  }
}

/**
 * SPEC-03 §5.3 / T-10 / T-20 — Archive blocked only by active linked goals.
 * Last active account may be archived (reopens needsSetup).
 */
export function assertCanArchiveAccount(input: {
  readonly accountId: string;
  readonly activeGoalsLinkedToAccount: ReadonlyArray<{ readonly id: string }>;
}): void {
  if (input.activeGoalsLinkedToAccount.length > 0) {
    throw new AccountLinkedToActiveGoalError();
  }
}

/**
 * SPEC-03 §5.4 / T-13 / T-14 / T-18 / T-20 — Hard-delete guards (pure).
 * Last-active guard applies only when the account is still active (`!isArchived`).
 */
export function assertCanDeleteAccount(input: {
  readonly accountId: string;
  readonly isArchived: boolean;
  readonly activeAccountCountInWorkspace: number;
  readonly activeGoalsLinkedToAccount: ReadonlyArray<{ readonly id: string }>;
  readonly hasCrossWorkspaceLinks: boolean;
}): void {
  if (input.activeGoalsLinkedToAccount.length > 0) {
    throw new AccountLinkedToActiveGoalError();
  }
  if (!input.isArchived && input.activeAccountCountInWorkspace === 1) {
    throw new CannotDeleteLastActiveAccountError();
  }
  if (input.hasCrossWorkspaceLinks) {
    throw new AccountHasCrossWorkspaceLinksError();
  }
}

/**
 * SPEC-03 §6 — Strong confirmation: confirmName must match account name (trim).
 */
export function assertDeleteAccountConfirmation(input: {
  readonly accountName: string;
  readonly confirmName: string;
}): void {
  if (input.confirmName.trim() !== input.accountName.trim()) {
    throw new AccountDeleteConfirmationMismatchError();
  }
}
