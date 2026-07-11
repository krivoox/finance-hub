/**
 * Pure domain types for the Dashboard read model (SPEC-12).
 *
 * The dashboard aggregates data that already lives in other feature domains
 * (accounts, transactions, budgets, goals, groups). No Prisma / Next / React
 * imports here so the pure calculators run in Vitest with plain fakes.
 */

import type { AccountBalance, AccountType } from "@/features/accounts/domain";
import type { TransactionType } from "@/features/transactions/domain";

/**
 * SPEC-12 FR-04 — Boundaries of the current calendar month in the user's
 * timezone, projected onto UTC milliseconds so they can be compared against
 * date-only fields (`Transaction.occurredOn`, stored as `@db.Date`).
 *
 * `start` is inclusive (00:00 of the 1st of the month), `end` is exclusive
 * (00:00 of the 1st of the next month).
 */
export type DashboardPeriod = {
  readonly start: Date;
  readonly end: Date;
};

/**
 * Net worth for a workspace in a single currency (SPEC-12 §4).
 * Unlike `Money`, may be negative when credit-card debt exceeds asset balances.
 */
export type TotalBalance = {
  readonly amountCents: number;
  readonly currency: string;
};

/**
 * Monthly cashflow summary (SPEC-12 T-02). Transfers are excluded on purpose:
 * they move money between accounts owned by the same workspace and do not
 * change income/expense figures.
 */
export type MonthlyCashflow = {
  readonly incomeCents: number;
  readonly expenseCents: number;
  readonly netCents: number;
  readonly currency: string;
};

/**
 * Minimal shape of an account with its derived balance that
 * `computeTotalBalance` needs. Matches `AccountWithBalance` from the accounts
 * service without pulling the prisma-shaped fields.
 */
export type DashboardAccount = {
  readonly type: AccountType;
  readonly currency: string;
  readonly isArchived: boolean;
  readonly currentBalance: AccountBalance;
};

/**
 * Minimal transaction fields consumed by cashflow / recent selectors. Matches
 * the domain `TransactionLike` (see `features/transactions/domain/types.ts`)
 * with only the properties the dashboard cares about.
 */
export type DashboardTransaction = {
  readonly type: TransactionType;
  readonly amountCents: number;
  readonly currency: string;
  readonly occurredOn: Date;
  readonly createdAt: Date;
};
