import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  assertCanReadTransactions,
  type TransactionType,
} from "@/features/transactions/domain";
import { parseOccurredOn } from "./utils";
import type { TransactionRecord } from "./require-transaction-membership";

export type ListTransactionsServiceInput = {
  userId: string;
  workspaceId: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};

export type ListedTransaction = TransactionRecord & {
  accountName: string;
  counterpartyAccountName: string | null;
  categoryName: string | null;
  createdByDisplayName: string;
};

export type ListTransactionsResult = {
  items: ListedTransaction[];
  nextCursor: string | null;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * SPEC-05 FR-04 / §6 — Lists transactions of a workspace ordered by
 * `occurredOn` desc, `createdAt` desc, then `id` desc for a stable cursor.
 * Supports keyset pagination via the `cursor` param.
 */
export async function listTransactions(
  input: ListTransactionsServiceInput,
): Promise<ListTransactionsResult> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanReadTransactions(role);

  const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const filters: Record<string, unknown> = {
    workspaceId: input.workspaceId,
  };
  if (input.type) filters.type = input.type;
  if (input.categoryId) filters.categoryId = input.categoryId;
  if (input.accountId) {
    filters.OR = [
      { accountId: input.accountId },
      { counterpartyAccountId: input.accountId },
    ];
  }
  if (input.from || input.to) {
    const range: { gte?: Date; lte?: Date } = {};
    if (input.from) range.gte = parseOccurredOn(input.from);
    if (input.to) range.lte = parseOccurredOn(input.to);
    filters.occurredOn = range;
  }

  const rows = await prisma.transaction.findMany({
    where: filters,
    orderBy: [
      { occurredOn: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit + 1,
    ...(input.cursor
      ? { skip: 1, cursor: { id: input.cursor } }
      : {}),
    select: {
      id: true,
      workspaceId: true,
      type: true,
      amountCents: true,
      currency: true,
      occurredOn: true,
      description: true,
      categoryId: true,
      accountId: true,
      counterpartyAccountId: true,
      createdByUserId: true,
      createdAt: true,
      updatedAt: true,
      account: { select: { name: true } },
      counterpartyAccount: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;

  const creatorIds = [...new Set(trimmed.map((r) => r.createdByUserId))];
  const creators =
    creatorIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true,
          },
        });
  const nameByUserId = new Map(
    creators.map((u) => [
      u.id,
      u.displayName?.trim() || u.name || u.email,
    ]),
  );

  const items: ListedTransaction[] = trimmed.map((r) => ({
    id: r.id,
    workspaceId: r.workspaceId,
    type: r.type as TransactionType,
    amountCents: r.amountCents,
    currency: r.currency,
    occurredOn: r.occurredOn,
    description: r.description,
    categoryId: r.categoryId,
    accountId: r.accountId,
    counterpartyAccountId: r.counterpartyAccountId,
    createdByUserId: r.createdByUserId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    accountName: r.account?.name ?? "",
    counterpartyAccountName: r.counterpartyAccount?.name ?? null,
    categoryName: r.category?.name ?? null,
    createdByDisplayName:
      nameByUserId.get(r.createdByUserId) ?? r.createdByUserId,
  }));

  return {
    items,
    nextCursor: hasMore ? trimmed[trimmed.length - 1].id : null,
  };
}
