"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock, Repeat } from "lucide-react";
import { toast } from "sonner";

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
import { formatDateOnly } from "@/lib/format-date";
import { formatMoney } from "@/lib/format-money";
import { refreshAfterMutation } from "@/lib/navigation";
import { materializeRecurringOccurrenceAction } from "@/features/recurring/actions";
import type { PendingOccurrence } from "@/features/recurring/services";
import type { OccurrenceStatus } from "@/features/recurring/domain";

import {
  OCCURRENCE_STATUS_LABEL_ES,
  RECURRING_TYPE_LABEL_ES,
} from "./labels";

type PendingOccurrencesTableProps = {
  items: readonly PendingOccurrence[];
  canMutate: boolean;
};

function occurrenceKey(item: PendingOccurrence): string {
  return `${item.ruleId}:${item.scheduledOn}`;
}

function amountVariant(
  type: PendingOccurrence["ruleType"],
): "income" | "expense" | "transfer" {
  if (type === "income") return "income";
  if (type === "expense") return "expense";
  return "transfer";
}

function statusVariant(
  status: OccurrenceStatus,
): "warning" | "secondary" | "outline" {
  if (status === "pending_past") return "warning";
  if (status === "pending_today") return "secondary";
  return "outline";
}

function accountLabel(item: PendingOccurrence): string {
  if (item.ruleType === "transfer" && item.counterpartyAccountName) {
    return `${item.accountName} → ${item.counterpartyAccountName}`;
  }
  return item.accountName;
}

function categoryLabel(item: PendingOccurrence): string | null {
  if (item.ruleType === "transfer") return "Transferencia";
  return item.categoryName;
}

export function PendingOccurrencesTable({
  items,
  canMutate,
}: PendingOccurrencesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const confirmableIds = useMemo(
    () =>
      canMutate
        ? items.filter((i) => i.isConfirmable).map(occurrenceKey)
        : [],
    [items, canMutate],
  );
  const selection = useRowSelection(confirmableIds);

  const confirmMany = (keys: readonly string[]) => {
    startTransition(async () => {
      let ok = 0;
      let failed = 0;
      let duplicates = 0;
      for (const key of keys) {
        const idx = key.lastIndexOf(":");
        const result = await materializeRecurringOccurrenceAction({
          ruleId: key.slice(0, idx),
          scheduledOn: key.slice(idx + 1),
        });
        if (!result.ok) {
          failed += 1;
          continue;
        }
        ok += 1;
        if (result.data.possibleDuplicates.length > 0) duplicates += 1;
      }

      if (ok > 0) {
        const base =
          ok === 1 ? "Recurrente registrada" : `${ok} recurrentes registradas`;
        if (duplicates > 0) {
          toast.warning(
            `${base}. Detectamos ${duplicates === 1 ? "una transacción parecida" : `${duplicates} transacciones parecidas`} en tu historial.`,
          );
        } else {
          toast.success(base);
        }
      }
      if (failed > 0) {
        toast.error(
          failed === 1
            ? "No se pudo registrar una ocurrencia"
            : `No se pudieron registrar ${failed} ocurrencias`,
        );
      }
      selection.clear();
      refreshAfterMutation(router);
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6">
        <div className="flex items-start gap-3">
          <Repeat
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Bandeja al día
            </p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              No hay recurrentes por confirmar. Cuando venza la próxima
              ocurrencia aparecerá acá.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BulkActionsBar
        selection={selection}
        singular="ocurrencia seleccionada"
        plural="ocurrencias seleccionadas"
      >
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5"
          disabled={isPending}
          onClick={() => confirmMany(selection.selectedIds)}
        >
          <CheckCircle2 className="size-3.5" strokeWidth={1.75} aria-hidden />
          {isPending ? "Registrando…" : "Confirmar"}
        </Button>
      </BulkActionsBar>

      <Table>
        <TableHeader>
          <TableRow>
            {canMutate ? (
              <SelectAllHead
                selection={selection}
                label="Seleccionar todas las ocurrencias confirmables"
              />
            ) : null}
            <TableHead>Descripción</TableHead>
            <TableHead className="hidden md:table-cell">Categoría</TableHead>
            <TableHead className="hidden lg:table-cell">Cuenta</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="hidden sm:table-cell">
              Fecha de cobro
            </TableHead>
            <TableHead className="hidden sm:table-cell">Estado</TableHead>
            {canMutate ? (
              <TableHead className="text-right">
                <span className="sr-only">Acciones</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const key = occurrenceKey(item);
            const selectable = canMutate && item.isConfirmable;
            return (
              <TableRow
                key={key}
                data-state={selection.isSelected(key) ? "selected" : undefined}
              >
                {canMutate ? (
                  <SelectRowCell
                    selection={selection}
                    id={key}
                    disabled={!selectable}
                    label={`Seleccionar ${item.ruleName} del ${formatDateOnly(item.scheduledOn)}`}
                  />
                ) : null}
                <TableCell>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium text-foreground">
                      {item.ruleName}
                    </span>
                    <span className="text-xs text-muted-foreground sm:hidden">
                      {formatDateOnly(item.scheduledOn)} ·{" "}
                      {OCCURRENCE_STATUS_LABEL_ES[item.status]}
                    </span>
                    <span className="text-xs text-muted-foreground md:hidden">
                      {RECURRING_TYPE_LABEL_ES[item.ruleType]} ·{" "}
                      {accountLabel(item)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <CategoryPill
                    label={categoryLabel(item)}
                    toneSeed={item.categoryId}
                  />
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {accountLabel(item)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={amountVariant(item.ruleType)}
                    className="tabular-nums"
                  >
                    {formatMoney(item.amountCents, item.currency)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                  {formatDateOnly(item.scheduledOn)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={statusVariant(item.status)}>
                    {OCCURRENCE_STATUS_LABEL_ES[item.status]}
                  </Badge>
                </TableCell>
                {canMutate ? (
                  <TableCell className="text-right">
                    {item.isConfirmable ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={isPending}
                        onClick={() => confirmMany([key])}
                      >
                        <CheckCircle2
                          className="size-3.5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        Confirmar
                      </Button>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                        title={`Se habilita el ${formatDateOnly(item.scheduledOn)}`}
                      >
                        <Lock
                          className="size-3.5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        Desde {formatDateOnly(item.scheduledOn)}
                      </span>
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
