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
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AbmTable,
  AbmHead,
  AbmCell,
  AbmGlyph,
  AbmMoney,
} from "@/components/abm-table";
import {
  BulkActionsBar,
  SelectAllHead,
  SelectRowCell,
  useRowSelection,
} from "@/components/data-table";
import { CategoryPill } from "@/features/categories/components/category-pill";
import {
  categoryPillTone,
  type CategoryPillTone,
} from "@/features/categories/domain/category-pill-tone";
import { splitLeadingEmoji } from "@/features/categories/domain/split-leading-emoji";
import { deleteTransactionAction } from "@/features/transactions/actions";
import type { TransactionType } from "@/features/transactions/domain";
import { formatDateOnly } from "@/lib/format-date";
import { navigateAndRefresh, refreshAfterMutation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { EditTransactionForm } from "./edit-transaction-form";
import { TRANSACTION_TYPE_LABEL_ES } from "./transaction-type-labels";

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

function typeToneClass(type: TransactionType): string {
  const variant = amountVariant(type);
  if (variant === "income") return "text-income";
  if (variant === "expense") return "text-expense";
  return "text-transfer";
}

const CHART_TONE_GLYPH: Record<CategoryPillTone, string> = {
  "chart-1": "bg-chart-1/15",
  "chart-2": "bg-chart-2/15",
  "chart-3": "bg-chart-3/15",
  "chart-4": "bg-chart-4/15",
  "chart-5": "bg-chart-5/15",
};

const FALLBACK_GLYPH: Record<"income" | "expense" | "transfer", string> = {
  income: "💰",
  expense: "🧾",
  transfer: "🔄",
};

function rowGlyph(tx: TableTransaction): { emoji: string; toneClass: string } {
  const variant = amountVariant(tx.type);
  if (tx.categoryName) {
    const { emoji } = splitLeadingEmoji(tx.categoryName);
    if (emoji) {
      const tone = categoryPillTone(tx.categoryId ?? tx.categoryName);
      return { emoji, toneClass: CHART_TONE_GLYPH[tone] };
    }
  }
  if (variant === "income") {
    return { emoji: FALLBACK_GLYPH.income, toneClass: "bg-income-muted" };
  }
  if (variant === "expense") {
    return { emoji: FALLBACK_GLYPH.expense, toneClass: "bg-expense-muted" };
  }
  return { emoji: FALLBACK_GLYPH.transfer, toneClass: "bg-transfer-muted" };
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
    <>
      <AbmTable
        bulk={
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
                  disabled={isPending}
                  onClick={() =>
                    navigateAndRefresh(
                      router,
                      `/transactions/${singleSelected.id}`,
                    )
                  }
                >
                  Abrir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isPending}
              onClick={() => deleteSelected(selection.selectedIds)}
            >
              <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
              Eliminar
            </Button>
          </BulkActionsBar>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              {canMutate ? (
                <SelectAllHead
                  selection={selection}
                  label="Seleccionar todas las transacciones"
                />
              ) : null}
              <AbmHead slot="identity">Descripción</AbmHead>
              <AbmHead hideBelow="sm">Cuenta</AbmHead>
              <AbmHead hideBelow="md">Categoría</AbmHead>
              <AbmHead hideBelow="lg">Tipo</AbmHead>
              <AbmHead hideBelow="sm">Fecha</AbmHead>
              <AbmHead slot="amount">Monto</AbmHead>
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
                    : (tx.categoryName ?? "Sin categoría");
              const description =
                tx.description ??
                (tx.type === "transfer"
                  ? "Transferencia"
                  : tx.type === "fx_debit" || tx.type === "fx_credit"
                    ? "Cambio de moneda"
                    : (splitLeadingEmoji(tx.categoryName ?? "").label ||
                      "Transacción"));
              const descriptionWithChip = tx.isExternalToWorkspace
                ? `${tx.registrationWorkspaceName ?? "Otro espacio"} · ${description}`
                : description;
              const glyph = rowGlyph(tx);

              return (
                <TableRow
                  key={tx.id}
                  className="relative border-border/60"
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
                  <AbmCell slot="identity">
                    <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                      <AbmGlyph className={glyph.toneClass}>
                        {glyph.emoji}
                      </AbmGlyph>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Link
                            href={`/transactions/${tx.id}`}
                            className="min-w-0 truncate font-semibold text-foreground after:absolute after:inset-0 hover:underline"
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
                            <Badge
                              variant="info"
                              className="relative z-10 hidden sm:inline-flex"
                            >
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
                    </div>
                  </AbmCell>
                  <AbmCell hideBelow="sm" muted>
                    {accountLabel}
                  </AbmCell>
                  <AbmCell hideBelow="md">
                    <CategoryPill
                      variant="text"
                      label={categoryLabel}
                      toneSeed={tx.categoryId ?? categoryLabel}
                    />
                  </AbmCell>
                  <AbmCell hideBelow="lg">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        typeToneClass(tx.type),
                      )}
                    >
                      {TRANSACTION_TYPE_LABEL_ES[tx.type]}
                    </span>
                  </AbmCell>
                  <AbmCell hideBelow="sm" className="tabular-nums" muted>
                    {formatDateOnly(tx.occurredOn)}
                  </AbmCell>
                  <AbmCell slot="amount">
                    <AbmMoney
                      cents={signedAmountCents(tx.type, tx.amountCents)}
                      currency={tx.currency}
                      tone={amountVariant(tx.type)}
                    />
                  </AbmCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </AbmTable>

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
    </>
  );
}
