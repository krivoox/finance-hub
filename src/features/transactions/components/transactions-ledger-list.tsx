"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { listTransactionsPageAction } from "@/features/transactions/actions";
import type { ListedTransactionPageItem } from "@/features/transactions/actions";
import type {
  CurrencyListTotals,
  ListTypeFilter,
} from "@/features/transactions/domain";

import {
  hasListTotalsToShow,
  TransactionsListTotals,
} from "./transactions-list-totals";
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
  /** Full filtered-set totals (SPEC-05 §4.6) — independent of pagination. */
  totals: readonly CurrencyListTotals[];
  canMutate: boolean;
  accounts: readonly { id: string; name: string; currency: string }[];
  categories: readonly {
    id: string;
    name: string;
    kind: "income" | "expense";
  }[];
};

/**
 * SPEC-05 §4.5 — First page from RSC; “Cargar más” appends via cursor.
 * Remount (key on page) when filters change so cursor state resets.
 * After mutations, `refreshAfterMutation` updates RSC props — first page is
 * derived from `initialItems` (not copied into useState) so the list cannot
 * stay stale while “load more” extras reset.
 */
export function TransactionsLedgerList({
  workspaceId,
  initialItems,
  initialNextCursor,
  query,
  totals,
  canMutate,
  accounts,
  categories,
}: TransactionsLedgerListProps) {
  const [extraItems, setExtraItems] = useState<ListedTransactionPageItem[]>(
    [],
  );
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setExtraItems([]);
    setNextCursor(initialNextCursor);
    setError(null);
  }, [initialItems, initialNextCursor]);

  const items = [...initialItems, ...extraItems];
  const showTotals = hasListTotalsToShow(totals, query.type);

  return (
    <>
      {showTotals ? (
        <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-border/70 bg-card/95 px-4 backdrop-blur-sm supports-backdrop-filter:bg-card/85 sm:-mx-6 sm:px-6 md:static md:mx-0 md:mb-2 md:border-border/50 md:bg-transparent md:px-0 md:backdrop-blur-none">
          <TransactionsListTotals
            buckets={totals}
            typeFilter={query.type}
            variant="strip"
          />
        </div>
      ) : null}

      <TransactionsTable
        items={items}
        workspaceId={workspaceId}
        totals={totals}
        typeFilter={query.type}
        canMutate={canMutate}
        accounts={accounts}
        categories={categories}
      />
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
                setExtraItems((prev) => [...prev, ...result.data.items]);
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
