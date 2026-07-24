"use server";

import { getSession } from "@/lib/session";
import {
  LIST_PAGE_SIZE,
  resolveListTypeFilter,
  type TransactionType,
} from "@/features/transactions/domain";
import {
  listTransactionsSchema,
  type ListTransactionsInput,
} from "@/features/transactions/schemas";
import { listTransactions } from "@/features/transactions/services";
import { transactionErrorToMessage, type ActionResult } from "./errors";

export type ListedTransactionPageItem = {
  id: string;
  workspaceId: string;
  type: TransactionType;
  amountCents: number;
  currency: string;
  occurredOn: string;
  description: string | null;
  categoryId: string | null;
  accountId: string;
  counterpartyAccountId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  accountName: string;
  accountWorkspaceId: string;
  counterpartyAccountName: string | null;
  categoryName: string | null;
  createdByDisplayName: string;
  isExternalToWorkspace: boolean;
  registrationWorkspaceName: string | null;
};

export type ListTransactionsPageData = {
  items: ListedTransactionPageItem[];
  nextCursor: string | null;
};

/**
 * SPEC-05 FR-04 — Forward page for cursor-append “Cargar más”.
 * Expects already-resolved `from`/`to` (or omitted for unbounded).
 */
export async function listTransactionsPageAction(
  input: ListTransactionsInput,
): Promise<ActionResult<ListTransactionsPageData>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = listTransactionsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const types = resolveListTypeFilter(parsed.data.type);
    const result = await listTransactions({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      accountId: parsed.data.accountId,
      categoryId: parsed.data.categoryId,
      types,
      from: parsed.data.from,
      to: parsed.data.to,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit ?? LIST_PAGE_SIZE,
    });

    return {
      ok: true,
      data: {
        items: result.items.map((tx) => ({
          id: tx.id,
          workspaceId: tx.workspaceId,
          type: tx.type,
          amountCents: tx.amountCents,
          currency: tx.currency,
          occurredOn: tx.occurredOn.toISOString(),
          description: tx.description,
          categoryId: tx.categoryId,
          accountId: tx.accountId,
          counterpartyAccountId: tx.counterpartyAccountId,
          createdByUserId: tx.createdByUserId,
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
          accountName: tx.accountName,
          accountWorkspaceId: tx.accountWorkspaceId,
          counterpartyAccountName: tx.counterpartyAccountName,
          categoryName: tx.categoryName,
          createdByDisplayName: tx.createdByDisplayName,
          isExternalToWorkspace: tx.isExternalToWorkspace,
          registrationWorkspaceName: tx.registrationWorkspaceName,
        })),
        nextCursor: result.nextCursor,
      },
    };
  } catch (err) {
    return { ok: false, error: transactionErrorToMessage(err) };
  }
}
