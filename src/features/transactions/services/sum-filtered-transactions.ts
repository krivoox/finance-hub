import "server-only";

import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  assertCanReadTransactions,
  summarizeListAmounts,
  type CurrencyListTotals,
  type TransactionType,
} from "@/features/transactions/domain";

import {
  buildListTransactionsWhere,
  type ListTransactionsFilterInput,
} from "./list-transactions-where";

export type SumFilteredTransactionsInput = ListTransactionsFilterInput & {
  userId: string;
};

/**
 * SPEC-05 §4.6 — Totals for the full filtered set (not just the current page).
 */
export async function sumFilteredTransactions(
  input: SumFilteredTransactionsInput,
): Promise<CurrencyListTotals[]> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanReadTransactions(role);

  const where = buildListTransactionsWhere(input);

  const groups = await prisma.transaction.groupBy({
    by: ["currency", "type"],
    where,
    _sum: { amountCents: true },
    _count: { _all: true },
  });

  return summarizeListAmounts(
    groups.map((g) => ({
      type: g.type as TransactionType,
      amountCents: g._sum.amountCents ?? 0,
      currency: g.currency,
      count: g._count._all,
    })),
  );
}
