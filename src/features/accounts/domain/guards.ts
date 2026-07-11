/**
 * Pure account invariants used by services and Server Actions (SPEC-03 §5).
 */

import {
  AccountArchivedError,
  AccountCurrencyMismatchError,
  InvalidAccountNameError,
  InvalidCreditLimitError,
  InvalidInitialBalanceError,
} from "./errors";
import type { AccountType } from "./types";

export {
  AccountArchivedError,
  AccountCurrencyMismatchError,
  InvalidAccountNameError,
  InvalidCreditLimitError,
  InvalidInitialBalanceError,
};

export const ACCOUNT_NAME_MAX_LENGTH = 80;

/**
 * SPEC-03 §5 — In MVP, an account's currency must match the workspace base
 * currency (no FX). Exact string equality; ISO 4217 codes are case-sensitive.
 */
export function assertCurrencyMatchesWorkspace(
  accountCurrency: string,
  workspaceBaseCurrency: string,
): void {
  if (accountCurrency !== workspaceBaseCurrency) {
    throw new AccountCurrencyMismatchError(
      accountCurrency,
      workspaceBaseCurrency,
    );
  }
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
 * when provided.
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
