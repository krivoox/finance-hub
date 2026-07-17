/**
 * Pure domain types for Budgets (SPEC-07).
 *
 * The persistence layer (Prisma) is intentionally not imported here so that
 * the domain runs in the browser and in Vitest with no database.
 */

export const BUDGET_PERIODS = ["monthly", "weekly", "custom"] as const;

export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export function isBudgetPeriod(value: unknown): value is BudgetPeriod {
  return (
    typeof value === "string" &&
    (BUDGET_PERIODS as readonly string[]).includes(value)
  );
}

export const BUDGET_STATUSES = [
  "on_track",
  "warning",
  "exceeded",
] as const;

export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

/**
 * Minimal domain view of a persisted budget — everything the domain needs to
 * compute progress and re-check invariants on updates. `categoryIds` empty
 * means "all expense categories in the workspace" (SPEC-07 §4).
 */
export type BudgetLike = {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly period: BudgetPeriod;
  readonly startDate: Date;
  readonly endDate: Date | null;
  readonly limitCents: number;
  readonly currency: string;
  readonly categoryIds: readonly string[];
  readonly isArchived: boolean;
};

/**
 * Period bounds returned by `getBudgetPeriodBounds`. Both dates are inclusive:
 * an expense with `occurredOn === end` is considered part of the period
 * (SPEC-07 §4).
 */
export type BudgetPeriodBounds = {
  readonly start: Date;
  readonly end: Date;
};

/**
 * Slim projection of a transaction used by budget spent calculations. Only
 * carries the fields required by SPEC-07 FR-02, so the domain does not depend
 * on the full `TransactionLike`.
 */
export type BudgetExpenseCandidate = {
  readonly type: "income" | "expense" | "transfer" | "fx_debit" | "fx_credit";
  readonly amountCents: number;
  readonly occurredOn: Date;
  readonly categoryId: string | null;
  /** When set, spent only includes txs matching budget.currency (SPEC-07 / ADR-006). */
  readonly currency?: string;
};

/**
 * Full progress snapshot for a budget in its currently active period.
 */
export type BudgetProgress = {
  readonly spentCents: number;
  readonly remainingCents: number;
  readonly status: BudgetStatus;
  readonly periodStart: Date;
  readonly periodEnd: Date;
};

export const BUDGET_NAME_MAX_LENGTH = 80;
