/**
 * Pure domain types for the Goals feature (SPEC-08).
 *
 * Persistence types (Prisma) are intentionally not imported so the domain
 * runs in the browser and in Vitest with no database.
 */

export const GOAL_KINDS = ["save", "debt_payoff"] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

export function isGoalKind(value: unknown): value is GoalKind {
  return (
    typeof value === "string" &&
    (GOAL_KINDS as readonly string[]).includes(value)
  );
}

export const GOAL_STATUSES = ["active", "completed", "cancelled"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export function isGoalStatus(value: unknown): value is GoalStatus {
  return (
    typeof value === "string" &&
    (GOAL_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Minimal domain view of a persisted Goal — everything the domain layer
 * needs to check invariants before/after a mutation. Currency and workspace
 * scoping are enforced by services (they need Postgres reads).
 */
export type GoalLike = {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly kind: GoalKind;
  readonly targetAmountCents: number;
  readonly currentAmountCents: number;
  readonly currency: string;
  readonly targetDate: Date | null;
  readonly linkedAccountId: string | null;
  readonly status: GoalStatus;
};

/**
 * Minimal view of a Goal contribution. Immutable in MVP.
 */
export type GoalContributionLike = {
  readonly id: string;
  readonly goalId: string;
  readonly amountCents: number;
  readonly contributedOn: Date;
  readonly note: string | null;
  readonly createdByUserId: string;
};
