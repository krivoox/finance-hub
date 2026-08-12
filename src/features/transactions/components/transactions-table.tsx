"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { FormSheet } from "@/components/form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BulkActionsBar,
  SelectAllHead,
  SelectRowCell,
  useRowSelection,
} from "@/components/data-table";
import { CategoryPill } from "@/features/categories/components/category-pill";
import { deleteTransactionAction } from "@/features/transactions/actions";
import type { TransactionType } from "@/features/transactions/domain";
import { formatDateOnly } from "@/lib/format-date";
import { formatSignedMoney } from "@/lib/format-money";
import { navigateAndRefresh, refreshAfterMutation } from "@/lib/navigation";

import { EditTransactionForm } from "./edit-transaction-form";

type AccountOption = { id: string; name: string; currency: string };
type CategoryOption = { id: string; name: string; kind: "income" | "expense" };

type TableTransaction = {
  id: string;
  type: TransactionType;
  amountCents: number;
  currency: string;
  occurredOn: Date | string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  accountId: string;
  accountName: string;
  accountWorkspaceId: string;
  counterpartyAccountId: string | null;
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

function occurredOnIso(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

type TransactionsTableProps = {
  items: readonly TableTransaction[];
  workspaceId: string;
  canMutate: boolean;
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
};

export function TransactionsTable({
  items,
  workspaceId,
  canMutate,
  accounts,
  categories,
}: TransactionsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  const selectableIds = useMemo(
    () => (canMutate ? items.map((tx) => tx.id) : []),
    [items, canMutate],
  );
  const selection = useRowSelection(selectableIds);

  const selectedItems = useMemo(
    () => items.filter((tx) => selection.selectedIds.includes(tx.id)),
    [items, selection.selectedIds],
  );
  const singleSelected =
    selectedItems.length === 1 ? selectedItems[0]! : null;

  const editAccounts = useMemo(() => {
    if (!singleSelected) return accounts;
    const ids = new Set(accounts.map((a) => a.id));
    const extras: AccountOption[] = [];
    if (!ids.has(singleSelected.accountId)) {
      extras.push({
        id: singleSelected.accountId,
        name: singleSelected.accountName,
        currency: singleSelected.currency,
      });
    }
    if (
      singleSelected.counterpartyAccountId &&
      !ids.has(singleSelected.counterpartyAccountId)
    ) {
      extras.push({
        id: singleSelected.counterpartyAccountId,
        name: singleSelected.counterpartyAccountName ?? "Cuenta",
        currency: singleSelected.currency,
      });
    }
    return extras.length > 0 ? [...accounts, ...extras] : accounts;
  }, [accounts, singleSelected]);

  function deleteSelected(ids: readonly string[]) {
    const ok = window.confirm(
      ids.length === 1
        ? "¿Eliminar esta transacción? No se puede deshacer."
        : `¿Eliminar ${ids.length} transacciones? No se puede deshacer.`,
    );
    if (!ok) return;

    startTransition(async () => {
      let okCount = 0;
      let failed = 0;
      for (const transactionId of ids) {
        const result = await deleteTransactionAction({ transactionId });
        if (result.ok) okCount += 1;
        else failed += 1;
      }

      if (okCount > 0) {
        toast.success(
          okCount === 1
            ? "Transacción eliminada"
            : `${okCount} transacciones eliminadas`,
        );
      }
      if (failed > 0) {
        toast.error(
          failed === 1
            ? "No se pudo eliminar una transacción"
            : `No se pudieron eliminar ${failed} transacciones`,
        );
      }
      selection.clear();
      setEditOpen(false);
      refreshAfterMutation(router);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <BulkActionsBar
        selection={selection}
        singular="transacción seleccionada"
        plural="transacciones seleccionadas"
      >
        {singleSelected ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={isPending}
              onClick={() =>
                navigateAndRefresh(router, `/transactions/${singleSelected.id}`)
              }
            >
              Abrir
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={isPending}
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
              Editar
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={isPending}
          onClick={() => deleteSelected(selection.selectedIds)}
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
          Eliminar
        </Button>
      </BulkActionsBar>

      <Table>
        <TableHeader>
          <TableRow>
            {canMutate ? (
              <SelectAllHead
                selection={selection}
                label="Seleccionar todas las transacciones"
              />
            ) : null}
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
                {canMutate ? (
                  <SelectRowCell
                    selection={selection}
                    id={tx.id}
                    label={`Seleccionar ${descriptionWithChip}`}
                  />
                ) : null}
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

      {singleSelected ? (
        <FormSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Editar transacción"
          description={
            singleSelected.goalContribution
              ? "Aporte a objetivo: solo fecha y descripción."
              : "Actualizá monto, fecha, cuenta o categoría."
          }
          size="md"
        >
          <EditTransactionForm
            key={singleSelected.id}
            transactionId={singleSelected.id}
            type={singleSelected.type}
            amountCents={singleSelected.amountCents}
            currency={singleSelected.currency}
            occurredOn={occurredOnIso(singleSelected.occurredOn)}
            description={singleSelected.description}
            categoryId={singleSelected.categoryId}
            accountId={singleSelected.accountId}
            counterpartyAccountId={singleSelected.counterpartyAccountId}
            accounts={editAccounts}
            categories={categories}
            linkedToGoal={singleSelected.goalContribution != null}
            onSuccess={() => {
              setEditOpen(false);
              selection.clear();
            }}
            onCancel={() => setEditOpen(false)}
          />
        </FormSheet>
      ) : null}
    </div>
  );
}
