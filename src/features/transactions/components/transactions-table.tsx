"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Repeat } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SelectAllHead,
  SelectRowCell,
  useRowSelection,
} from "@/components/data-table";
import { CategoryPill } from "@/features/categories/components/category-pill";
import { formatDateOnly } from "@/lib/format-date";
import { formatSignedMoney } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import type {
  CurrencyListTotals,
  ListTypeFilter,
  TransactionType,
} from "@/features/transactions/domain";

import {
  hasListTotalsToShow,
  TransactionsListTotals,
} from "./transactions-list-totals";
import { TRANSACTION_TYPE_LABEL_ES } from "./transaction-type-labels";

type TableTransaction = {
  id: string;
  type: TransactionType;
  amountCents: number;
  currency: string;
  occurredOn: Date | string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  accountName: string;
  accountWorkspaceId: string;
  counterpartyAccountName: string | null;
  createdByDisplayName: string;
  isExternalToWorkspace: boolean;
  registrationWorkspaceName: string | null;
  goalContribution: {
    contributionId: string;
    goalId: string;
    goalName: string;
    goalKind: "save" | "debt_payoff";
  } | null;
  recurring: {
    ruleId: string;
    ruleName: string;
    scheduledOn: string;
    isDrifted: boolean;
  } | null;
};

function amountVariant(
  type: TransactionType,
): "income" | "expense" | "transfer" {
  if (type === "fx_credit" || type === "income") return "income";
  if (type === "fx_debit" || type === "expense") return "expense";
  return "transfer";
}

function typeBadgeVariant(
  type: TransactionType,
): "income" | "expense" | "transfer" {
  return amountVariant(type);
}

function signedAmountCents(
  type: TransactionType,
  amountCents: number,
): number {
  if (type === "income" || type === "fx_credit") return amountCents;
  if (type === "expense" || type === "fx_debit") return -amountCents;
  return -amountCents;
}

const headClass =
  "h-9 px-3 text-xs font-normal tracking-normal text-muted-foreground";

type TransactionsTableProps = {
  items: readonly TableTransaction[];
  workspaceId: string;
  totals: readonly CurrencyListTotals[];
  typeFilter: ListTypeFilter;
};

export function TransactionsTable({
  items,
  workspaceId,
  totals,
  typeFilter,
}: TransactionsTableProps) {
  const selectableIds = useMemo(() => items.map((tx) => tx.id), [items]);
  const selection = useRowSelection(selectableIds);
  const showTotalsFooter = hasListTotalsToShow(totals, typeFilter);

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/70 hover:bg-transparent">
          <SelectAllHead
            selection={selection}
            label="Seleccionar todas las transacciones"
          />
          <TableHead className={headClass}>Descripción</TableHead>
          <TableHead className={cn(headClass, "hidden sm:table-cell")}>
            Cuenta
          </TableHead>
          <TableHead className={cn(headClass, "hidden md:table-cell")}>
            Categoría
          </TableHead>
          <TableHead className={cn(headClass, "hidden lg:table-cell")}>
            Tipo
          </TableHead>
          <TableHead className={cn(headClass, "hidden lg:table-cell")}>
            Registró
          </TableHead>
          <TableHead className={cn(headClass, "hidden sm:table-cell")}>
            Fecha
          </TableHead>
          <TableHead className={cn(headClass, "text-right")}>Monto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((tx) => {
          const accountLabel =
            tx.type === "transfer" && tx.counterpartyAccountName
              ? `${tx.accountName} → ${tx.counterpartyAccountName}`
              : tx.isExternalToWorkspace && tx.registrationWorkspaceName
                ? `${tx.registrationWorkspaceName} · ${tx.accountName}`
                : tx.accountName;
          const categoryLabel =
            tx.type === "transfer"
              ? "Transferencia"
              : tx.type === "fx_debit" || tx.type === "fx_credit"
                ? "Cambio de moneda"
                : (tx.categoryName ?? "—");
          const description =
            tx.description ??
            (tx.type === "transfer"
              ? "Transferencia"
              : tx.type === "fx_debit" || tx.type === "fx_credit"
                ? "Cambio de moneda"
                : (tx.categoryName ?? "Transacción"));
          const descriptionWithChip = tx.isExternalToWorkspace
            ? `${tx.registrationWorkspaceName ?? "Otro espacio"} · ${description}`
            : description;

          return (
            <TableRow
              key={tx.id}
              className="relative border-border/60"
              data-state={
                selection.isSelected(tx.id) ? "selected" : undefined
              }
            >
              <SelectRowCell
                selection={selection}
                id={tx.id}
                label={`Seleccionar ${descriptionWithChip}`}
              />
              <TableCell className="px-3 py-2.5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="font-medium text-foreground after:absolute after:inset-0 hover:underline"
                    >
                      {descriptionWithChip}
                    </Link>
                    {tx.recurring ? (
                      <span
                        className="relative z-10 inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground"
                        title={`Generada por: ${tx.recurring.ruleName}`}
                        aria-label={`Generada por la recurrente ${tx.recurring.ruleName}`}
                      >
                        <Repeat
                          className="size-3.5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </span>
                    ) : null}
                    {tx.goalContribution ? (
                      <Badge variant="info" className="relative z-10">
                        {tx.goalContribution.goalKind === "debt_payoff"
                          ? "Pago de deuda"
                          : "Aporte a objetivo"}
                      </Badge>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground sm:hidden">
                    {accountLabel}
                    {" · "}
                    {formatDateOnly(tx.occurredOn)}
                  </span>
                  {tx.accountWorkspaceId !== workspaceId &&
                  !tx.isExternalToWorkspace ? (
                    <span className="text-xs text-muted-foreground">
                      Pagado desde otro espacio
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">
                {accountLabel}
              </TableCell>
              <TableCell className="hidden px-3 py-2.5 md:table-cell">
                <CategoryPill
                  label={categoryLabel}
                  toneSeed={tx.categoryId}
                />
              </TableCell>
              <TableCell className="hidden px-3 py-2.5 lg:table-cell">
                <Badge
                  variant={typeBadgeVariant(tx.type)}
                  className="font-normal"
                >
                  {TRANSACTION_TYPE_LABEL_ES[tx.type]}
                </Badge>
              </TableCell>
              <TableCell className="hidden px-3 py-2.5 text-muted-foreground lg:table-cell">
                {tx.createdByDisplayName}
              </TableCell>
              <TableCell className="hidden px-3 py-2.5 tabular-nums text-muted-foreground sm:table-cell">
                {formatDateOnly(tx.occurredOn)}
              </TableCell>
              <TableCell className="px-3 py-2.5 text-right">
                <span
                  className={cn(
                    "tabular-nums text-sm font-medium",
                    amountVariant(tx.type) === "income" && "text-income",
                    amountVariant(tx.type) === "expense" && "text-expense",
                    amountVariant(tx.type) === "transfer" && "text-transfer",
                  )}
                >
                  {formatSignedMoney(
                    signedAmountCents(tx.type, tx.amountCents),
                    tx.currency,
                  )}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      {showTotalsFooter ? (
        <TableFooter className="hidden border-t border-border bg-muted/30 sm:table-footer-group">
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={7} className="px-3 py-3" />
            <TableCell className="px-3 py-3">
              <TransactionsListTotals
                buckets={totals}
                typeFilter={typeFilter}
                variant="footer"
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  );
}
