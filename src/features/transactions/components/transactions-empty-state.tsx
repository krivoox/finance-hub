import Link from "next/link";

import { Button } from "@/components/ui/button";

import {
  transactionListHref,
  type TransactionListParams,
} from "../lib/list-search-params";

export type TransactionsEmptyKind =
  | "no_transactions"
  | "no_period_results"
  | "no_filter_match";

type TransactionsEmptyStateProps = {
  kind: TransactionsEmptyKind;
  params: TransactionListParams;
  canMutate: boolean;
  /** Preserve `?new=` when linking. */
  newParam?: string | null;
};

export function TransactionsEmptyState({
  kind,
  params,
  canMutate,
  newParam,
}: TransactionsEmptyStateProps) {
  if (kind === "no_transactions") {
    return (
      <div className="flex flex-col items-start gap-3 py-8 sm:py-12">
        <p className="text-sm text-muted-foreground text-pretty">
          Todavía no hay movimientos. Registrá el primero cuando quieras.
        </p>
        {canMutate ? (
          <Button asChild className="h-10 sm:h-9">
            <Link
              href={transactionListHref({
                ...params,
                new: newParam ?? "1",
              })}
            >
              Registrar
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }

  if (kind === "no_filter_match") {
    return (
      <div className="flex flex-col items-start gap-3 py-8 sm:py-12">
        <p className="text-sm text-muted-foreground text-pretty">
          Ningún movimiento coincide con los filtros.
        </p>
        <Button asChild variant="outline" className="h-10 sm:h-9">
          <Link
            href={transactionListHref({
              period: params.period,
              from: params.from,
              to: params.to,
              type: "all",
              accountId: null,
              categoryId: null,
              new: newParam,
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
        No hay movimientos {periodHint}. Probá otro rango o mirá todo el
        historial.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-10 sm:h-9">
          <Link
            href={transactionListHref({
              period: "all",
              type: params.type,
              accountId: params.accountId,
              categoryId: params.categoryId,
              new: newParam,
            })}
          >
            Ver todo
          </Link>
        </Button>
        {params.period === "custom" ? (
          <Button asChild variant="ghost" className="h-10 sm:h-9">
            <Link
              href={transactionListHref({
                period: "this_month",
                type: params.type,
                accountId: params.accountId,
                categoryId: params.categoryId,
                new: newParam,
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

export function resolveTransactionsEmptyKind(
  params: TransactionListParams,
  hasDenseFilters: boolean,
): TransactionsEmptyKind {
  if (hasDenseFilters) return "no_filter_match";
  if (params.period === "all") return "no_transactions";
  return "no_period_results";
}
