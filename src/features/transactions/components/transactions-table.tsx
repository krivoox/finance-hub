"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Repeat } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
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
import type { TransactionType } from "@/features/transactions/domain";

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

function signedAmountCents(
  type: TransactionType,
  amountCents: number,
): number {
  if (type === "income" || type === "fx_credit") return amountCents;
  if (type === "expense" || type === "fx_debit") return -amountCents;
  return -amountCents;
}

type TransactionsTableProps = {
  items: readonly TableTransaction[];
  workspaceId: string;
};

export function TransactionsTable({
  items,
  workspaceId,
}: TransactionsTableProps) {
  const selectableIds = useMemo(() => items.map((tx) => tx.id), [items]);
  const selection = useRowSelection(selectableIds);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SelectAllHead
            selection={selection}
            label="Seleccionar todas las transacciones"
          />
          <TableHead>Descripción</TableHead>
          <TableHead className="hidden sm:table-cell">Cuenta</TableHead>
          <TableHead className="hidden md:table-cell">Categoría</TableHead>
          <TableHead className="hidden lg:table-cell">Registró</TableHead>
          <TableHead className="hidden sm:table-cell">Fecha</TableHead>
          <TableHead className="text-right">Monto</TableHead>
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
              className="relative"
              data-state={
                selection.isSelected(tx.id) ? "selected" : undefined
              }
            >
              <SelectRowCell
                selection={selection}
                id={tx.id}
                label={`Seleccionar ${descriptionWithChip}`}
              />
              <TableCell>
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
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {accountLabel}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <CategoryPill
                  label={categoryLabel}
                  toneSeed={tx.categoryId}
                />
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {tx.createdByDisplayName}
              </TableCell>
              <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                {formatDateOnly(tx.occurredOn)}
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant={amountVariant(tx.type)}
                  className="tabular-nums"
                >
                  {formatSignedMoney(
                    signedAmountCents(tx.type, tx.amountCents),
                    tx.currency,
                  )}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
