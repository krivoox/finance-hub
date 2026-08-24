"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

import {
  transactionListHref,
  type TransactionListParams,
  type TransactionsEmptyKind,
} from "../lib/list-search-params";
import { OpenNewTransactionButton } from "./open-new-transaction-button";

export type { TransactionsEmptyKind };

type TransactionsEmptyStateProps = {
  kind: TransactionsEmptyKind;
  params: TransactionListParams;
  canMutate: boolean;
};

export function TransactionsEmptyState({
  kind,
  params,
  canMutate,
}: TransactionsEmptyStateProps) {
  if (kind === "no_transactions") {
    return (
      <div className="flex flex-col items-start gap-3 py-8 sm:py-12">
        <p className="text-sm text-muted-foreground text-pretty">
          Todavía no hay transacciones. Registrá la primera cuando quieras.
        </p>
        {canMutate ? (
          <OpenNewTransactionButton
            
            label="Nueva transacción"
          />
        ) : null}
      </div>
    );
  }

  if (kind === "no_filter_match") {
    return (
      <div className="flex flex-col items-start gap-3 py-8 sm:py-12">
        <p className="text-sm text-muted-foreground text-pretty">
          Ninguna transacción coincide con los filtros.
        </p>
        <Button asChild variant="outline" >
          <Link
            href={transactionListHref({
              period: params.period,
              from: params.from,
              to: params.to,
              type: "all",
              accountId: null,
              categoryId: null,
            })}
          >
            Limpiar filtros
          </Link>
        </Button>
      </div>
    );
  }

  // no_period_results
  const periodHint =
    params.period === "this_week"
      ? "esta semana"
      : params.period === "custom"
        ? "este periodo"
        : "este mes";

  return (
    <div className="flex flex-col items-start gap-3 py-8 sm:py-12">
      <p className="text-sm text-muted-foreground text-pretty">
        No hay transacciones {periodHint}. Probá otro rango o mirá todo el
        historial.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" >
          <Link
            href={transactionListHref({
              period: "all",
              type: params.type,
              accountId: params.accountId,
              categoryId: params.categoryId,
            })}
          >
            Ver todo
          </Link>
        </Button>
        {params.period === "custom" ? (
          <Button asChild variant="ghost" >
            <Link
              href={transactionListHref({
                period: "this_month",
                type: params.type,
                accountId: params.accountId,
                categoryId: params.categoryId,
              })}
            >
              Este mes
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
