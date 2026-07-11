import "server-only";
import { prisma } from "@/lib/prisma";
import {
  computeMonthlyCashflow,
  computeTotalBalance,
  getCurrentMonthPeriod,
  selectActiveGoalsProgress,
  selectBudgetsAtRisk,
  selectRecentTransactions,
  type BudgetAtRiskItem,
  type DashboardPeriod,
  type DashboardTransaction,
  type GoalProgressItem,
  type MemberBalanceItem,
  type MonthlyCashflow,
  type TotalBalance,
} from "@/features/dashboard/domain";
import {
  listAccounts,
  type AccountWithBalance,
} from "@/features/accounts/services";
import {
  listTransactions,
  type ListedTransaction,
} from "@/features/transactions/services";
import type { TransactionType } from "@/features/transactions/domain";
import { listBudgetsWithStatus } from "@/features/budgets/services";
import { listGoals } from "@/features/goals/services";
import { getMemberBalances } from "@/features/splits/services";
import { NotAGroupWorkspaceError } from "@/features/splits/domain";
import { requireMembership } from "@/features/workspaces/services";

export type GetDashboardInput = {
  userId: string;
  workspaceId: string;
  timezone: string;
  currency: string;
  now?: Date;
  recentLimit?: number;
};

export type GetDashboardResult = {
  workspaceId: string;
  workspaceType: "personal" | "group";
  currency: string;
  period: DashboardPeriod;
  totalBalance: TotalBalance;
  monthlyCashflow: MonthlyCashflow;
  recentTransactions: ListedTransaction[];
  accounts: AccountWithBalance[];
  budgetsAtRisk: BudgetAtRiskItem[];
  goalsProgress: GoalProgressItem[];
  memberBalances: MemberBalanceItem[] | null;
};

const DEFAULT_RECENT_LIMIT = 10;

/**
 * SPEC-12 GetDashboard — full read model: balance, cashflow, recent txs,
 * budgets at risk, active goals, and member balances for group workspaces.
 */
export async function getDashboard(
  input: GetDashboardInput,
): Promise<GetDashboardResult> {
  await requireMembership(input.userId, input.workspaceId);

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: input.workspaceId },
    select: { type: true },
  });

  const now = input.now ?? new Date();
  const period = getCurrentMonthPeriod(now, input.timezone);
  const recentLimit = input.recentLimit ?? DEFAULT_RECENT_LIMIT;

  const [accounts, monthTransactions, recentResult, budgets, goals] =
    await Promise.all([
      listAccounts({
        userId: input.userId,
        workspaceId: input.workspaceId,
      }),
      loadMonthlyCashflowTransactions(input.workspaceId, period),
      listTransactions({
        userId: input.userId,
        workspaceId: input.workspaceId,
        limit: recentLimit,
      }),
      listBudgetsWithStatus({
        userId: input.userId,
        workspaceId: input.workspaceId,
        referenceDate: now,
      }),
      listGoals({
        userId: input.userId,
        workspaceId: input.workspaceId,
      }),
    ]);

  let memberBalances: MemberBalanceItem[] | null = null;
  if (workspace.type === "group") {
    try {
      const balances = await getMemberBalances({
        userId: input.userId,
        workspaceId: input.workspaceId,
      });
      const members = await prisma.membership.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          user: { select: { id: true, name: true, displayName: true, email: true } },
        },
      });
      const nameById = new Map(
        members.map((m) => [
          m.userId,
          m.user.displayName?.trim() || m.user.name || m.user.email,
        ]),
      );
      memberBalances = balances.map((b) => ({
        ...b,
        displayName: nameById.get(b.userId),
      }));
    } catch (err) {
      if (!(err instanceof NotAGroupWorkspaceError)) throw err;
      memberBalances = null;
    }
  }

  return {
    workspaceId: input.workspaceId,
    workspaceType: workspace.type as "personal" | "group",
    currency: input.currency,
    period,
    totalBalance: computeTotalBalance(accounts, input.currency),
    monthlyCashflow: computeMonthlyCashflow(
      monthTransactions,
      period.start,
      period.end,
      input.currency,
    ),
    recentTransactions: selectRecentTransactions(
      recentResult.items,
      recentLimit,
    ),
    accounts,
    budgetsAtRisk: selectBudgetsAtRisk(budgets),
    goalsProgress: selectActiveGoalsProgress(goals),
    memberBalances,
  };
}

async function loadMonthlyCashflowTransactions(
  workspaceId: string,
  period: DashboardPeriod,
): Promise<DashboardTransaction[]> {
  const rows = await prisma.transaction.findMany({
    where: {
      workspaceId,
      occurredOn: { gte: period.start, lt: period.end },
      type: { in: ["income", "expense"] },
    },
    select: {
      type: true,
      amountCents: true,
      currency: true,
      occurredOn: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    type: r.type as TransactionType,
    amountCents: r.amountCents,
    currency: r.currency,
    occurredOn: r.occurredOn,
    createdAt: r.createdAt,
  }));
}
