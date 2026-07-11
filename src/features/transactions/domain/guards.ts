/**
 * Pure transaction invariants (SPEC-05 §4 / SPEC-06 §4).
 *
 * These helpers are consumed by services before persistence. They do NOT hit
 * the database — the caller is responsible for loading the referenced entities
 * and passing plain values in.
 */

import type { CategoryKind } from "@/features/categories/domain";
import {
  AccountArchivedError,
  AccountWorkspaceMismatchError,
  CategoryKindMismatchError,
  CategoryNotAllowedError,
  CategoryRequiredError,
  CounterpartyNotAllowedError,
  CounterpartyRequiredError,
  InvalidAmountError,
  InvalidDescriptionError,
  InvalidOccurredOnError,
  OccurredOnTooFutureError,
  SameAccountTransferError,
  TransactionCurrencyMismatchError,
} from "./errors";
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_TYPE_TO_CATEGORY_KIND,
  type TransactionType,
} from "./types";

/**
 * SPEC-05 T-03 / FR-05 — `amountCents` must be a positive integer.
 * The `Money` value object is non-negative and cents-only (ADR-001); zero is
 * not a meaningful movement.
 */
export function assertValidAmount(amountCents: number): void {
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
    throw new InvalidAmountError(
      "amountCents debe ser un número entero (en centavos)",
    );
  }
  if (amountCents <= 0) {
    throw new InvalidAmountError();
  }
}

/**
 * SPEC-05 §4 / SPEC-06 §4 — income/expense require categoryId; transfer must
 * NOT have a category.
 */
export function assertCategoryRequiredForType(
  type: TransactionType,
  categoryId: string | null | undefined,
): void {
  const hasCategory = typeof categoryId === "string" && categoryId.length > 0;
  if (type === "transfer") {
    if (hasCategory) throw new CategoryNotAllowedError();
    return;
  }
  if (!hasCategory) throw new CategoryRequiredError(type);
}

/**
 * SPEC-05 T-04 — When the transaction has a category, its `kind` must match
 * the transaction `type`. Transfers do not have categories (see
 * `assertCategoryRequiredForType`); passing a categoryKind for a transfer is
 * treated as an assertion mistake and rejected.
 */
export function assertCategoryKindMatches(
  type: TransactionType,
  categoryKind: CategoryKind,
): void {
  const expected = TRANSACTION_TYPE_TO_CATEGORY_KIND[type];
  if (expected === null) {
    throw new CategoryNotAllowedError();
  }
  if (expected !== categoryKind) {
    throw new CategoryKindMismatchError(type, categoryKind);
  }
}

/**
 * SPEC-05 T-07 — Archived accounts cannot receive new transactions.
 * `isArchived` is passed as a boolean so this stays pure (no Prisma import).
 */
export function assertAccountActive(isArchived: boolean): void {
  if (isArchived) throw new AccountArchivedError();
}

/**
 * SPEC-06 T-02 — Transfers must have distinct origin and destination.
 * Both must be non-empty strings; empty destinations are handled via
 * `assertTransferCounterparty`.
 */
export function assertTransferAccounts(
  accountId: string,
  counterpartyAccountId: string,
): void {
  if (accountId === counterpartyAccountId) {
    throw new SameAccountTransferError();
  }
}

/**
 * SPEC-06 FR-01 — Only transfers may carry `counterpartyAccountId`; other
 * types must leave it null. Transfers must have it set.
 */
export function assertTransferCounterparty(
  type: TransactionType,
  counterpartyAccountId: string | null | undefined,
): void {
  const hasCounterparty =
    typeof counterpartyAccountId === "string" &&
    counterpartyAccountId.length > 0;
  if (type === "transfer") {
    if (!hasCounterparty) throw new CounterpartyRequiredError();
    return;
  }
  if (hasCounterparty) throw new CounterpartyNotAllowedError();
}

/**
 * MVP: transaction currency must equal account currency (no FX).
 * `account.currency` and `tx.currency` are compared with strict equality.
 */
export function assertTransactionCurrencyMatchesAccount(
  txCurrency: string,
  accountCurrency: string,
): void {
  if (txCurrency !== accountCurrency) {
    throw new TransactionCurrencyMismatchError(txCurrency, accountCurrency);
  }
}

/**
 * ADR-002 — Every referenced account must live in the transaction's workspace.
 * Verified by the service after loading each account.
 */
export function assertAccountBelongsToWorkspace(
  accountWorkspaceId: string,
  workspaceId: string,
): void {
  if (accountWorkspaceId !== workspaceId) {
    throw new AccountWorkspaceMismatchError();
  }
}

/**
 * Extracts the calendar day (year/month/day) of a Date in a given timezone.
 * Uses `Intl.DateTimeFormat` with the "en-CA" locale which yields
 * YYYY-MM-DD parts reliably.
 */
function calendarDay(
  date: Date,
  timezone: string | undefined,
): { y: number; m: number; d: number } {
  if (!timezone) {
    return {
      y: date.getUTCFullYear(),
      m: date.getUTCMonth() + 1,
      d: date.getUTCDate(),
    };
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { y, m, d };
}

function calendarDayIndex(date: Date, timezone: string | undefined): number {
  const { y, m, d } = calendarDay(date, timezone);
  return Date.UTC(y, m - 1, d);
}

/**
 * SPEC-05 §4 — `occurredOn` may be at most `today + 1 day` in the user's
 * timezone (tolerance for clock skew). No lower bound; the past is always
 * allowed.
 */
export function assertOccurredOnNotTooFuture(
  occurredOn: Date,
  now: Date,
  timezone?: string,
): void {
  if (!(occurredOn instanceof Date) || Number.isNaN(occurredOn.getTime())) {
    throw new InvalidOccurredOnError();
  }
  const ONE_DAY_MS = 86_400_000;
  const occurred = calendarDayIndex(occurredOn, timezone);
  const today = calendarDayIndex(now, timezone);
  if (occurred - today > ONE_DAY_MS) {
    throw new OccurredOnTooFutureError();
  }
}

/**
 * Normalizes the description: trims, collapses inner whitespace, coerces empty
 * to `null`. Rejects strings past `TRANSACTION_DESCRIPTION_MAX_LENGTH`.
 */
export function normalizeDescription(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") {
    throw new InvalidDescriptionError("La descripción debe ser texto");
  }
  const collapsed = raw.trim().replace(/\s+/g, " ");
  if (collapsed.length === 0) return null;
  if (collapsed.length > TRANSACTION_DESCRIPTION_MAX_LENGTH) {
    throw new InvalidDescriptionError(
      `La descripción admite hasta ${TRANSACTION_DESCRIPTION_MAX_LENGTH} caracteres`,
    );
  }
  return collapsed;
}
