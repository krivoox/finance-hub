import "server-only";

import type { TransactionType } from "@/features/transactions/domain";
import { parseOccurredOn } from "./utils";

export type ListTransactionsFilterInput = {
  workspaceId: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  types?: TransactionType[];
  from?: string;
  to?: string;
};

/**
 * Shared Prisma `where` for list + filtered totals (SPEC-05 FR-04 / §4.6).
 * KRI-29: only the personal workspace ledger (no cross-tenant account hits).
 */
export function buildListTransactionsWhere(input: ListTransactionsFilterInput) {
  const dateRange =
    input.from || input.to
      ? {
          ...(input.from ? { gte: parseOccurredOn(input.from) } : {}),
          ...(input.to ? { lte: parseOccurredOn(input.to) } : {}),
        }
      : undefined;

  const typeFilter = resolveTypeWhere(input);

  return {
    AND: [
      { workspaceId: input.workspaceId },
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
}

function resolveTypeWhere(
  input: Pick<ListTransactionsFilterInput, "type" | "types">,
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
