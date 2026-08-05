/**
 * SPEC-18 §4.1 — Recurring rule invariants (pure).
 */

import {
  assertAccountActive,
  assertAccountBelongsToWorkspace,
  assertCategoryKindMatches,
  assertCategoryRequiredForType,
  assertTransactionCurrencyMatchesAccount,
  assertTransferAccounts,
  assertTransferCounterparty,
  assertValidAmount,
} from "@/features/transactions/domain";
import type { CategoryKind } from "@/features/categories/domain";
import {
  TransactionCurrencyMismatchError,
} from "@/features/transactions/domain";

import { assertDateOnly, compareDateOnly } from "./date-only";
import {
  InvalidRecurringAmountError,
  InvalidRecurringDatesError,
  InvalidRecurringNameError,
  RecurringCurrencyImmutableError,
  RecurringTypeImmutableError,
} from "./errors";
import {
  RECURRING_DESCRIPTION_MAX_LENGTH,
  RECURRING_NAME_MAX_LENGTH,
  type RecurringFrequency,
  type RecurringRuleType,
} from "./types";

export function normalizeRecurringName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function assertValidRecurringName(name: string): void {
  if (typeof name !== "string") {
    throw new InvalidRecurringNameError("El nombre debe ser texto");
  }
  const normalized = normalizeRecurringName(name);
  if (normalized.length === 0) {
    throw new InvalidRecurringNameError("El nombre es obligatorio");
  }
  if (normalized.length > RECURRING_NAME_MAX_LENGTH) {
    throw new InvalidRecurringNameError(
      `El nombre debe tener ${RECURRING_NAME_MAX_LENGTH} caracteres o menos`,
    );
  }
}

export function assertValidRecurringAmount(amountCents: number): void {
  try {
    assertValidAmount(amountCents);
  } catch {
    throw new InvalidRecurringAmountError();
  }
}

export function assertValidRecurringDates(
  startDate: string,
  endDate: string | null | undefined,
): void {
  assertDateOnly(startDate);
  if (endDate != null) {
    assertDateOnly(endDate);
    if (compareDateOnly(endDate, startDate) < 0) {
      throw new InvalidRecurringDatesError(
        "La fecha de fin no puede ser anterior al inicio",
      );
    }
  }
}

export function assertValidDescription(
  description: string | null | undefined,
): string | null {
  if (description == null) return null;
  const trimmed = description.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return null;
  if (trimmed.length > RECURRING_DESCRIPTION_MAX_LENGTH) {
    throw new InvalidRecurringNameError(
      `La descripción debe tener ${RECURRING_DESCRIPTION_MAX_LENGTH} caracteres o menos`,
    );
  }
  return trimmed;
}

export type AssertRecurringAccountsInput = {
  readonly type: RecurringRuleType;
  readonly workspaceId: string;
  readonly currency: string;
  readonly account: {
    readonly id: string;
    readonly workspaceId: string;
    readonly currency: string;
    readonly isArchived: boolean;
  };
  readonly counterparty: {
    readonly id: string;
    readonly workspaceId: string;
    readonly currency: string;
    readonly isArchived: boolean;
  } | null;
  readonly category: {
    readonly id: string;
    readonly kind: CategoryKind;
    readonly isArchived: boolean;
  } | null;
};

/**
 * Validates accounts/category shape for create & update (SPEC-18 §4.1).
 */
export function assertRecurringRuleShape(
  input: AssertRecurringAccountsInput,
): void {
  assertAccountActive(input.account.isArchived);
  assertAccountBelongsToWorkspace(
    input.account.workspaceId,
    input.workspaceId,
  );
  assertTransactionCurrencyMatchesAccount(
    input.currency,
    input.account.currency,
  );

  assertTransferCounterparty(
    input.type,
    input.counterparty?.id ?? null,
  );
  assertCategoryRequiredForType(input.type, input.category?.id ?? null);

  if (input.type === "transfer") {
    if (!input.counterparty) return;
    assertAccountActive(input.counterparty.isArchived);
    assertAccountBelongsToWorkspace(
      input.counterparty.workspaceId,
      input.workspaceId,
    );
    assertTransferAccounts(input.account.id, input.counterparty.id);
    if (input.account.currency !== input.counterparty.currency) {
      throw new TransactionCurrencyMismatchError(
        input.account.currency,
        input.counterparty.currency,
      );
    }
  } else if (input.category) {
    if (input.category.isArchived) {
      throw new InvalidRecurringNameError("La categoría está archivada");
    }
    assertCategoryKindMatches(input.type, input.category.kind);
  }
}

export function assertTypeImmutable(
  current: RecurringRuleType,
  next: RecurringRuleType | undefined,
): void {
  if (next !== undefined && next !== current) {
    throw new RecurringTypeImmutableError();
  }
}

export function assertCurrencyImmutable(
  current: string,
  next: string | undefined,
): void {
  if (next !== undefined && next !== current) {
    throw new RecurringCurrencyImmutableError();
  }
}

export function isRecurringFrequency(
  value: string,
): value is RecurringFrequency {
  return (
    value === "weekly" ||
    value === "biweekly" ||
    value === "monthly" ||
    value === "yearly"
  );
}
