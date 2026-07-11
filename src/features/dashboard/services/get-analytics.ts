import "server-only";
import { prisma } from "@/lib/prisma";
import {
  aggregateSpendingByCategory,
  buildMonthlySeries,
  computeInsights,
  getCurrentMonthPeriod,
  summarizeCashflow,
  type AnalyticsTransaction,
  type Insight,
  type MonthlySeriesPoint,
  type SpendingByCategoryRow,
  type CashflowSummary,
} from "@/features/dashboard/domain";
import { listBudgetsWithStatus } from "@/features/budgets/services";
import { requireMembership } from "@/features/workspaces/services";

export type GetAnalyticsResult = {
  spendingByCategory: SpendingByCategoryRow[];
  cashflow: CashflowSummary;
  monthlySeries: MonthlySeriesPoint[];
  insights: Insight[];
};

export async function getAnalytics(input: {
  userId: string;
  workspaceId: string;
  timezone: string;
  now?: Date;
  months?: number;
}): Promise<GetAnalyticsResult> {
  await requireMembership(input.userId, input.workspaceId);

  const now = input.now ?? new Date();
  const months = input.months ?? 6;
  const currentPeriod = getCurrentMonthPeriod(now, input.timezone);

  // Previous calendar month window [prevStart, currentStart)
  const prevStart = new Date(
    Date.UTC(
      currentPeriod.start.getUTCFullYear(),
      currentPeriod.start.getUTCMonth() - 1,
      1,
    ),
  );

  const seriesStart = new Date(
    Date.UTC(
      currentPeriod.start.getUTCFullYear(),
      currentPeriod.start.getUTCMonth() - (months - 1),
      1,
    ),
  );

  const [txRows, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        workspaceId: input.workspaceId,
        occurredOn: { gte: seriesStart, lt: currentPeriod.end },
        type: { in: ["income", "expense"] },
      },
      select: {
        type: true,
        amountCents: true,
        categoryId: true,
        occurredOn: true,
        category: { select: { name: true } },
      },
    }),
    listBudgetsWithStatus({
      userId: input.userId,
      workspaceId: input.workspaceId,
      referenceDate: now,
    }),
  ]);

  const all: AnalyticsTransaction[] = txRows.map((r) => ({
    type: r.type as "income" | "expense",
    amountCents: r.amountCents,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? null,
    occurredOn: r.occurredOn,
  }));

  const currentTxs = all.filter(
    (t) =>
      t.occurredOn >= currentPeriod.start && t.occurredOn < currentPeriod.end,
  );
  const previousTxs = all.filter(
    (t) => t.occurredOn >= prevStart && t.occurredOn < currentPeriod.start,
  );

  const spendingByCategory = aggregateSpendingByCategory(currentTxs);
  const previousSpending = aggregateSpendingByCategory(previousTxs);
  const budgetsExceededCount = budgets.filter(
    (b) => !b.isArchived && b.progress.status === "exceeded",
  ).length;

  return {
    spendingByCategory,
    cashflow: summarizeCashflow(currentTxs),
    monthlySeries: buildMonthlySeries(all, months, currentPeriod.start),
    insights: computeInsights({
      currentSpending: spendingByCategory,
      previousSpending,
      budgetsExceededCount,
    }),
  };
}
