import type { BudgetStatus } from "@/features/budgets/domain";

export type BudgetAtRiskItem = {
  id: string;
  name: string;
  status: Extract<BudgetStatus, "warning" | "exceeded">;
  spentCents: number;
  limitCents: number;
  remainingCents: number;
};

export type GoalProgressItem = {
  id: string;
  name: string;
  kind: string;
  progressPercent: number;
  currentAmountCents: number;
  targetAmountCents: number;
  status: string;
};

export type MemberBalanceItem = {
  userId: string;
  netCents: number;
  displayName?: string;
};

/**
 * SPEC-12 T-03 — budgets at risk are those in warning or exceeded status.
 */
export function selectBudgetsAtRisk<
  T extends {
    id: string;
    name: string;
    isArchived: boolean;
    limitCents: number;
    progress: {
      status: BudgetStatus;
      spentCents: number;
      remainingCents: number;
    };
  },
>(budgets: readonly T[]): BudgetAtRiskItem[] {
  return budgets
    .filter(
      (b) =>
        !b.isArchived &&
        (b.progress.status === "warning" || b.progress.status === "exceeded"),
    )
    .map((b) => ({
      id: b.id,
      name: b.name,
      status: b.progress.status as "warning" | "exceeded",
      spentCents: b.progress.spentCents,
      limitCents: b.limitCents,
      remainingCents: b.progress.remainingCents,
    }));
}

/**
 * SPEC-12 — active goals for the dashboard strip.
 */
export function selectActiveGoalsProgress<
  T extends {
    id: string;
    name: string;
    kind: string;
    progressPercent: number;
    currentAmountCents: number;
    targetAmountCents: number;
    status: string;
  },
>(goals: readonly T[]): GoalProgressItem[] {
  return goals
    .filter((g) => g.status === "active")
    .map((g) => ({
      id: g.id,
      name: g.name,
      kind: g.kind,
      progressPercent: g.progressPercent,
      currentAmountCents: g.currentAmountCents,
      targetAmountCents: g.targetAmountCents,
      status: g.status,
    }));
}
