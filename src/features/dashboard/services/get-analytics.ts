import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  aggregateSpendingByCategory,
  aggregateSpendingByCategoryByMonth,
  aggregateSpendingFlows,
  buildMonthlySeries,
  computeInsights,
  getCurrentMonthPeriod,
  summarizeCashflow,
  type AnalyticsTransaction,
  type Insight,
  type MonthlySeriesPoint,
  type SpendingByCategoryRow,
  type SpendingFlow,
  type CashflowSummary,
} from "@/features/dashboard/domain";
import { listBudgetsWithStatus } from "@/features/budgets/services";
import { requireMembership } from "@/features/workspaces/services";

export type GetAnalyticsResult = {
  spendingByCategory: SpendingByCategoryRow[];
  /** Expenses by category for each month in `monthlySeries` (transfers/`fx_*` excluded). */
  monthlyCategorySpending: Record<string, SpendingByCategoryRow[]>;
  spendingFlows: SpendingFlow[];
  cashflow: CashflowSummary;
  monthlySeries: MonthlySeriesPoint[];
  insights: Insight[];
};

/** Mobile Panel home: monthly bars + category donut. No insights / budgets. */
export type GetAnalyticsHomeResult = Pick<
  GetAnalyticsResult,
  "monthlySeries" | "monthlyCategorySpending"
>;

type AnalyticsInput = {
  userId: string;
  workspaceId: string;
  timezone: string;
  now?: Date;
  months?: number;
};

function analyticsSeriesWindow(now: Date, timezone: string, months: number) {
  const currentPeriod = getCurrentMonthPeriod(now, timezone);
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
  return { currentPeriod, prevStart, seriesStart };
}

/**
 * Ledger slice for analytics series. Primitive args so React.cache hits when
 * the mobile home and full getAnalytics run in the same RSC request.
 * Request-scoped only — no cross-request TTL of money data (SPEC-20).
 */
const loadAnalyticsTransactions = cache(
  async (
    userId: string,
    workspaceId: string,
    seriesStartIso: string,
    periodEndIso: string,
  ): Promise<AnalyticsTransaction[]> => {
    await requireMembership(userId, workspaceId);

    const txRows = await prisma.transaction.findMany({
      where: {
        workspaceId,
        occurredOn: { gte: new Date(seriesStartIso), lt: new Date(periodEndIso) },
        type: { in: ["income", "expense"] },
      },
      select: {
        type: true,
        amountCents: true,
        categoryId: true,
        accountId: true,
        occurredOn: true,
        category: { select: { name: true } },
        account: { select: { name: true } },
      },
    });

    return txRows.map((r) => ({
      type: r.type as "income" | "expense",
      amountCents: r.amountCents,
      categoryId: r.categoryId,
      categoryName: r.category?.name ?? null,
      accountId: r.accountId,
      accountName: r.account?.name ?? null,
      occurredOn: r.occurredOn,
    }));
  },
);

function toAnalyticsHome(
  all: AnalyticsTransaction[],
  months: number,
  currentPeriodStart: Date,
): GetAnalyticsHomeResult {
  const monthlySeries = buildMonthlySeries(all, months, currentPeriodStart);
  return {
    monthlySeries,
    monthlyCategorySpending: aggregateSpendingByCategoryByMonth(
      all,
      monthlySeries.map((p) => p.yearMonth),
    ),
  };
}

async function loadAnalyticsLedger(input: AnalyticsInput): Promise<{
  all: AnalyticsTransaction[];
  months: number;
  currentPeriod: ReturnType<typeof getCurrentMonthPeriod>;
  prevStart: Date;
}> {
  const now = input.now ?? new Date();
  const months = input.months ?? 6;
  const { currentPeriod, prevStart, seriesStart } = analyticsSeriesWindow(
    now,
    input.timezone,
    months,
  );

  const all = await loadAnalyticsTransactions(
    input.userId,
    input.workspaceId,
    seriesStart.toISOString(),
    currentPeriod.end.toISOString(),
  );

  return { all, months, currentPeriod, prevStart };
}

/**
 * Lightweight analytics for the mobile Panel home. Awaits only the cached
 * transaction slice + monthly aggregates — not budgets, insights, or GetDashboard.
 */
export async function getAnalyticsHome(
  input: AnalyticsInput,
): Promise<GetAnalyticsHomeResult> {
  const { all, months, currentPeriod } = await loadAnalyticsLedger(input);
  return toAnalyticsHome(all, months, currentPeriod.start);
}

export async function getAnalytics(
  input: AnalyticsInput,
): Promise<GetAnalyticsResult> {
  const now = input.now ?? new Date();

  // Txs and budgets in parallel. Home does not await this budgets call;
  // listBudgetsWithStatus is already request-cached with GetDashboard.
  const [ledger, budgets] = await Promise.all([
    loadAnalyticsLedger({ ...input, now }),
    listBudgetsWithStatus({
      userId: input.userId,
      workspaceId: input.workspaceId,
      referenceDate: now,
    }),
  ]);

  const { all, months, currentPeriod, prevStart } = ledger;
  const currentTxs = all.filter(
    (t) =>
      t.occurredOn >= currentPeriod.start && t.occurredOn < currentPeriod.end,
  );
  const previousTxs = all.filter(
    (t) => t.occurredOn >= prevStart && t.occurredOn < currentPeriod.start,
  );

  const spendingByCategory = aggregateSpendingByCategory(currentTxs);
  const home = toAnalyticsHome(all, months, currentPeriod.start);

  return {
    ...home,
    spendingByCategory,
    spendingFlows: aggregateSpendingFlows(currentTxs),
    cashflow: summarizeCashflow(currentTxs),
    insights: computeInsights({
      currentSpending: spendingByCategory,
      previousSpending: aggregateSpendingByCategory(previousTxs),
      budgetsExceededCount: budgets.filter(
        (b) => !b.isArchived && b.progress.status === "exceeded",
      ).length,
    }),
  };
}
