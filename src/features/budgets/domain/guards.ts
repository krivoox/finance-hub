/**
 * Pure budget invariants (SPEC-07 §4).
 *
 * Guards run before persistence so we surface friendly errors without touching
 * the database.
 */

import {
  BudgetDomainError,
  InvalidBudgetEndDateError,
  InvalidBudgetLimitError,
  InvalidBudgetNameError,
  MissingBudgetEndDateError,
  UnexpectedBudgetEndDateError,
  UnsupportedBudgetCurrencyError,
} from "./errors";
import { BUDGET_NAME_MAX_LENGTH, type BudgetPeriod } from "./types";
import { isAccountCurrency } from "@/domain/money/currencies";

/**
 * SPEC-07 §4 — Name must be non-empty (after trimming) and at most
 * `BUDGET_NAME_MAX_LENGTH` characters. Callers should normalize with
 * `normalizeBudgetName` first when they want to persist the trimmed value.
 */
export function assertValidBudgetName(name: string): void {
  if (typeof name !== "string") {
    throw new InvalidBudgetNameError(
      "El nombre del presupuesto debe ser texto",
    );
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new InvalidBudgetNameError();
  }
  if (trimmed.length > BUDGET_NAME_MAX_LENGTH) {
    throw new InvalidBudgetNameError(
      `El nombre admite hasta ${BUDGET_NAME_MAX_LENGTH} caracteres`,
    );
  }
}

export function normalizeBudgetName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * SPEC-07 §4 — `limit > 0`. Amounts are stored as integer cents (ADR-001).
 */
export function assertValidBudgetLimit(amountCents: number): void {
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
    throw new InvalidBudgetLimitError(
      "El límite debe ser un entero (en centavos)",
    );
  }
  if (amountCents <= 0) {
    throw new InvalidBudgetLimitError();
  }
}

/**
 * SPEC-07 §4 / §5 — Encodes the period-kind vs endDate rules:
 * - `custom` requires `endDate` and `endDate >= startDate`.
 * - `monthly` / `weekly` reject an explicit `endDate` because the period is
 *   derived from `startDate` at read time.
 */
export function assertValidBudgetPeriodBounds(
  period: BudgetPeriod,
  startDate: Date,
  endDate: Date | null,
): void {
  if (
    !(startDate instanceof Date) ||
    Number.isNaN(startDate.getTime())
  ) {
    throw new BudgetDomainError("La fecha de inicio es inválida");
  }

  if (period === "custom") {
    if (!endDate) throw new MissingBudgetEndDateError();
    if (Number.isNaN(endDate.getTime())) {
      throw new InvalidBudgetEndDateError("La fecha de fin es inválida");
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new InvalidBudgetEndDateError();
    }
    return;
  }

  if (endDate) {
    throw new UnexpectedBudgetEndDateError();
  }
}

export const BUDGET_LIMIT_MIN_CENTS = 1;

/**
 * SPEC-07 / ADR-006 — Budget currency must be ARS|USD (may differ from base).
 */
export function assertBudgetCurrencyAllowed(currency: string): void {
  if (!isAccountCurrency(currency)) {
    throw new UnsupportedBudgetCurrencyError(currency);
  }
}
