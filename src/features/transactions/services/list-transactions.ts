import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  assertCanReadTransactions,
  LIST_PAGE_SIZE,
  type TransactionType,
} from "@/features/transactions/domain";
import { parseOccurredOn } from "./utils";
import type { TransactionRecord } from "./require-transaction-membership";

export type ListTransactionsServiceInput = {
  userId: string;
  workspaceId: string;
  accountId?: string;
  categoryId?: string;
  /** Single type (legacy). Prefer `types` from `resolveListTypeFilter`. */
  type?: TransactionType;
  /** When set, filters with `type in (…)`. Empty/undefined = all types incl. fx. */
  types?: TransactionType[];
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};

export type ListedTransaction = TransactionRecord & {
  accountName: string;
  accountWorkspaceId: string;
  counterpartyAccountName: string | null;
  categoryName: string | null;
  createdByDisplayName: string;
  /** True when listed because it hits a local account but registers elsewhere. */
  isExternalToWorkspace: boolean;
  registrationWorkspaceName: string | null;
};

export type ListTransactionsResult = {
  items: ListedTransaction[];
  nextCursor: string | null;
};

const MAX_LIMIT = 200;

/**
 * SPEC-05 FR-04 + SPEC-14 FR-05 — Lists transactions of a workspace ordered by
 * `occurredOn` desc, plus txs that affect local accounts but register elsewhere.
 *
 * Invalid cursor → first page (soft-reset, SPEC-05 §4.5).
 */
export async function listTransactions(
  input: ListTransactionsServiceInput,
): Promise<ListTransactionsResult> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanReadTransactions(role);

  const limit = Math.min(input.limit ?? LIST_PAGE_SIZE, MAX_LIMIT);

  const localAccountIds = (
    await prisma.financeAccount.findMany({
      where: { workspaceId: input.workspaceId },
      select: { id: true },
    })
  ).map((a) => a.id);

  const dateRange =
    input.from || input.to
      ? {
          ...(input.from ? { gte: parseOccurredOn(input.from) } : {}),
          ...(input.to ? { lte: parseOccurredOn(input.to) } : {}),
        }
      : undefined;

  const typeFilter = resolveTypeWhere(input);

  const filters = {
    AND: [
      {
        OR: [
          { workspaceId: input.workspaceId },
          ...(localAccountIds.length > 0
            ? [
                {
                  AND: [
                    { workspaceId: { not: input.workspaceId } },
                    {
                      OR: [
                        { accountId: { in: localAccountIds } },
                        { counterpartyAccountId: { in: localAccountIds } },
                      ],
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      ...(typeFilter ? [typeFilter] : []),
      ...(input.categoryId ? [{ categoryId: input.categoryId }] : []),
      ...(input.accountId
        ? [
            {
              OR: [
                { accountId: input.accountId },
                { counterpartyAccountId: input.accountId },
              ],
            },
          ]
        : []),
      ...(dateRange ? [{ occurredOn: dateRange }] : []),
    ],
  };

  // Soft-reset: missing / foreign cursor → first page (SPEC-05 §4.5).
  let cursorId = input.cursor;
  if (cursorId) {
    const anchor = await prisma.transaction.findUnique({
      where: { id: cursorId },
      select: { id: true },
    });
    if (!anchor) {
      cursorId = undefined;
    }
  }

  const rows = await prisma.transaction.findMany({
    where: filters,
    orderBy: [
      { occurredOn: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit + 1,
    ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
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
      workspace: { select: { name: true } },
      account: { select: { name: true, workspaceId: true } },
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

  const items: ListedTransaction[] = trimmed.map((r) => {
    const isExternal = r.workspaceId !== input.workspaceId;
    return {
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
      accountWorkspaceId: r.account?.workspaceId ?? r.workspaceId,
      counterpartyAccountName: r.counterpartyAccount?.name ?? null,
      categoryName: r.category?.name ?? null,
      createdByDisplayName:
        nameByUserId.get(r.createdByUserId) ?? r.createdByUserId,
      isExternalToWorkspace: isExternal,
      registrationWorkspaceName: isExternal ? r.workspace.name : null,
    };
  });

  return {
    items,
    nextCursor: hasMore ? trimmed[trimmed.length - 1].id : null,
  };
}

function resolveTypeWhere(
  input: ListTransactionsServiceInput,
): { type: TransactionType } | { type: { in: TransactionType[] } } | null {
  if (input.types && input.types.length > 0) {
    return input.types.length === 1
      ? { type: input.types[0] }
      : { type: { in: input.types } };
  }
  if (input.type) {
    return { type: input.type };
  }
  return null;
}
