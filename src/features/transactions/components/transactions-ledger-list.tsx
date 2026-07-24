"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { listTransactionsPageAction } from "@/features/transactions/actions";
import type { ListedTransactionPageItem } from "@/features/transactions/actions";
import type { ListTypeFilter } from "@/features/transactions/domain";

import { TransactionsTable } from "./transactions-table";

export type LedgerListQuery = {
  workspaceId: string;
  type: ListTypeFilter;
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
};

type TransactionsLedgerListProps = {
  workspaceId: string;
  initialItems: readonly ListedTransactionPageItem[];
  initialNextCursor: string | null;
  query: LedgerListQuery;
};

/**
 * SPEC-05 §4.5 — First page from RSC; “Cargar más” appends via cursor.
 * Remount (key on page) when filters change so cursor state resets.
 */
export function TransactionsLedgerList({
  workspaceId,
  initialItems,
  initialNextCursor,
  query,
}: TransactionsLedgerListProps) {
  const [items, setItems] = useState(() => [...initialItems]);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <TransactionsTable items={items} workspaceId={workspaceId} />
      {error ? (
        <p className="mt-4 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {nextCursor ? (
        <div className="mt-6 flex justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:mt-8">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full max-w-sm sm:h-9 sm:w-auto sm:min-w-[10rem]"
            disabled={pending}
            aria-busy={pending}
            onClick={() => {
              startTransition(async () => {
                setError(null);
                const result = await listTransactionsPageAction({
                  workspaceId: query.workspaceId,
                  type: query.type === "all" ? undefined : query.type,
                  accountId: query.accountId,
                  categoryId: query.categoryId,
                  from: query.from,
                  to: query.to,
                  cursor: nextCursor,
                });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setItems((prev) => [...prev, ...result.data.items]);
                setNextCursor(result.data.nextCursor);
              });
            }}
          >
            {pending ? "Cargando…" : "Cargar más"}
          </Button>
        </div>
      ) : null}
    </>
  );
}
