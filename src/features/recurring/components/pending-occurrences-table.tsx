"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock, Repeat } from "lucide-react";
import { toast } from "sonner";

import {
  AbmTable,
  AbmHead,
  AbmCell,
  AbmMoney,
} from "@/components/abm-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
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

function signedAmountCents(
  type: PendingOccurrence["ruleType"],
  amountCents: number,
): number {
  if (type === "income") return amountCents;
  return -amountCents;
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
    <AbmTable
      bulk={
        <BulkActionsBar
          selection={selection}
          singular="ocurrencia seleccionada"
          plural="ocurrencias seleccionadas"
        >
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => confirmMany(selection.selectedIds)}
          >
            <CheckCircle2 className="size-3.5" strokeWidth={1.75} aria-hidden />
            {isPending ? "Registrando…" : "Confirmar"}
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
                label="Seleccionar todas las ocurrencias confirmables"
              />
            ) : null}
            <AbmHead slot="identity">Descripción</AbmHead>
            <AbmHead hideBelow="md">Categoría</AbmHead>
            <AbmHead hideBelow="lg">Cuenta</AbmHead>
            <AbmHead slot="amount">Monto</AbmHead>
            <AbmHead hideBelow="sm">Fecha de cobro</AbmHead>
            <AbmHead hideBelow="sm">Estado</AbmHead>
            {canMutate ? (
              <AbmHead slot="action">
                <span className="sr-only">Acciones</span>
              </AbmHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const key = occurrenceKey(item);
            const selectable = canMutate && item.isConfirmable;
            const tone = amountVariant(item.ruleType);
            return (
              <TableRow
                key={key}
                className="border-border/60"
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
                <AbmCell slot="identity">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {item.ruleName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground sm:hidden">
                      {formatDateOnly(item.scheduledOn)} ·{" "}
                      {OCCURRENCE_STATUS_LABEL_ES[item.status]}
                    </span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:block md:hidden">
                      {RECURRING_TYPE_LABEL_ES[item.ruleType]} ·{" "}
                      {accountLabel(item)}
                    </span>
                    {canMutate && item.isConfirmable ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="relative z-10 mt-1 w-fit sm:hidden"
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
                    ) : null}
                  </div>
                </AbmCell>
                <AbmCell hideBelow="md">
                  <CategoryPill
                    label={categoryLabel(item)}
                    toneSeed={item.categoryId}
                  />
                </AbmCell>
                <AbmCell hideBelow="lg" muted>
                  {accountLabel(item)}
                </AbmCell>
                <AbmCell slot="amount">
                  <AbmMoney
                    cents={signedAmountCents(item.ruleType, item.amountCents)}
                    currency={item.currency}
                    tone={tone}
                  />
                </AbmCell>
                <AbmCell hideBelow="sm" className="tabular-nums" muted>
                  {formatDateOnly(item.scheduledOn)}
                </AbmCell>
                <AbmCell hideBelow="sm">
                  <Badge variant={statusVariant(item.status)}>
                    {OCCURRENCE_STATUS_LABEL_ES[item.status]}
                  </Badge>
                </AbmCell>
                {canMutate ? (
                  <AbmCell slot="action">
                    {item.isConfirmable ? (
                      <Button
                        type="button"
                        size="sm"
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
                  </AbmCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </AbmTable>
  );
}
