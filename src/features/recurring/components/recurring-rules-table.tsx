"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pause,
  Play,
  StopCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  endRecurringRuleAction,
  pauseRecurringRuleAction,
  resumeRecurringRuleAction,
} from "@/features/recurring/actions";
import type { RecurringRuleListItem } from "@/features/recurring/services";

import {
  RECURRING_FREQUENCY_LABEL_ES,
  RECURRING_PAUSED_REASON_LABEL_ES,
  RECURRING_STATUS_LABEL_ES,
  RECURRING_TYPE_LABEL_ES,
} from "./labels";

type RecurringRulesTableProps = {
  rules: readonly RecurringRuleListItem[];
  canMutate: boolean;
};

function amountVariant(
  type: RecurringRuleListItem["type"],
): "income" | "expense" | "transfer" {
  if (type === "income") return "income";
  if (type === "expense") return "expense";
  return "transfer";
}

function statusVariant(
  status: RecurringRuleListItem["status"],
): "success" | "warning" | "outline" {
  if (status === "active") return "success";
  if (status === "paused") return "warning";
  return "outline";
}

function accountLabel(rule: RecurringRuleListItem): string {
  if (rule.type === "transfer" && rule.counterpartyAccountName) {
    return `${rule.accountName} → ${rule.counterpartyAccountName}`;
  }
  return rule.accountName;
}

function categoryLabel(rule: RecurringRuleListItem): string | null {
  if (rule.type === "transfer") return "Transferencia";
  return rule.categoryName;
}

function executedLabel(count: number): string {
  if (count === 0) return "Ninguna";
  if (count === 1) return "1 vez";
  return `${count} veces`;
}

export function RecurringRulesTable({
  rules,
  canMutate,
}: RecurringRulesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const selectableIds = useMemo(
    () =>
      canMutate
        ? rules.filter((r) => r.status !== "ended").map((r) => r.id)
        : [],
    [rules, canMutate],
  );
  const selection = useRowSelection(selectableIds);

  const runBulk = (
    action: "pause" | "resume" | "end",
    ids: readonly string[],
  ) => {
    if (action === "end") {
      const ok = window.confirm(
        ids.length === 1
          ? "¿Finalizar la recurrente? Deja de generar nuevas ocurrencias. No borra transacciones ya registradas."
          : `¿Finalizar ${ids.length} recurrentes? Dejan de generar nuevas ocurrencias. No borra transacciones ya registradas.`,
      );
      if (!ok) return;
    }

    startTransition(async () => {
      let okCount = 0;
      let failed = 0;
      for (const ruleId of ids) {
        const result =
          action === "pause"
            ? await pauseRecurringRuleAction({ ruleId })
            : action === "resume"
              ? await resumeRecurringRuleAction({ ruleId })
              : await endRecurringRuleAction({ ruleId });
        if (result.ok) okCount += 1;
        else failed += 1;
      }

      if (okCount > 0) {
        const label =
          action === "pause"
            ? okCount === 1
              ? "Recurrente pausada"
              : `${okCount} recurrentes pausadas`
            : action === "resume"
              ? okCount === 1
                ? "Recurrente reanudada"
                : `${okCount} recurrentes reanudadas`
              : okCount === 1
                ? "Recurrente finalizada"
                : `${okCount} recurrentes finalizadas`;
        toast.success(label);
      }
      if (failed > 0) {
        toast.error(
          failed === 1
            ? "No se pudo actualizar una recurrente"
            : `No se pudieron actualizar ${failed} recurrentes`,
        );
      }
      selection.clear();
      refreshAfterMutation(router);
    });
  };

  if (rules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6">
        <p className="text-sm font-medium text-foreground">Sin plantillas</p>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Creá tu primera recurrente para automatizar sueldos, alquiler o
          suscripciones.
        </p>
      </div>
    );
  }

  const selectedActive = selection.selectedIds.filter((id) =>
    rules.some((r) => r.id === id && r.status === "active"),
  );
  const selectedPaused = selection.selectedIds.filter((id) =>
    rules.some((r) => r.id === id && r.status === "paused"),
  );

  return (
    <div className="flex flex-col gap-3">
      <BulkActionsBar
        selection={selection}
        singular="plantilla seleccionada"
        plural="plantillas seleccionadas"
      >
        {selectedActive.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={isPending}
            onClick={() => runBulk("pause", selectedActive)}
          >
            <Pause className="size-3.5" strokeWidth={1.75} aria-hidden />
            Pausar
          </Button>
        ) : null}
        {selectedPaused.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={isPending}
            onClick={() => runBulk("resume", selectedPaused)}
          >
            <Play className="size-3.5" strokeWidth={1.75} aria-hidden />
            Reanudar
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={isPending}
          onClick={() => runBulk("end", selection.selectedIds)}
        >
          <StopCircle className="size-3.5" strokeWidth={1.75} aria-hidden />
          Finalizar
        </Button>
      </BulkActionsBar>

      <Table>
        <TableHeader>
          <TableRow>
            {canMutate ? (
              <SelectAllHead
                selection={selection}
                label="Seleccionar todas las plantillas"
              />
            ) : null}
            <TableHead>Descripción</TableHead>
            <TableHead className="hidden md:table-cell">Categoría</TableHead>
            <TableHead className="hidden lg:table-cell">Cuenta</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="hidden sm:table-cell">Frecuencia</TableHead>
            <TableHead className="hidden sm:table-cell">
              Fecha de cobro
            </TableHead>
            <TableHead className="hidden md:table-cell">Ejecutada</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-10 text-right">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => {
            const selectable = canMutate && rule.status !== "ended";
            return (
              <TableRow
                key={rule.id}
                data-state={
                  selection.isSelected(rule.id) ? "selected" : undefined
                }
                className="relative"
              >
                {canMutate ? (
                  <SelectRowCell
                    selection={selection}
                    id={rule.id}
                    disabled={!selectable}
                    label={`Seleccionar ${rule.name}`}
                  />
                ) : null}
                <TableCell>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link
                      href={`/transactions/recurring/${rule.id}`}
                      className="font-medium text-foreground after:absolute after:inset-0 hover:underline"
                    >
                      {rule.name}
                    </Link>
                    <span className="text-xs text-muted-foreground sm:hidden">
                      {RECURRING_FREQUENCY_LABEL_ES[rule.frequency]}
                      {rule.nextOccurrence
                        ? ` · ${formatDateOnly(rule.nextOccurrence)}`
                        : ""}
                    </span>
                    <span className="text-xs text-muted-foreground md:hidden">
                      {RECURRING_TYPE_LABEL_ES[rule.type]} ·{" "}
                      {accountLabel(rule)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <CategoryPill
                    label={categoryLabel(rule)}
                    toneSeed={rule.categoryId}
                  />
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {accountLabel(rule)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={amountVariant(rule.type)}
                    className="tabular-nums"
                  >
                    {formatMoney(rule.amountCents, rule.currency)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {RECURRING_FREQUENCY_LABEL_ES[rule.frequency]}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {rule.nextOccurrence ? (
                    <Badge variant="success" className="tabular-nums font-normal">
                      {formatDateOnly(rule.nextOccurrence)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {executedLabel(rule.materializedCount)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={statusVariant(rule.status)}>
                      {RECURRING_STATUS_LABEL_ES[rule.status]}
                    </Badge>
                    {rule.status === "paused" && rule.pausedReason ? (
                      <span className="text-[11px] text-muted-foreground">
                        {RECURRING_PAUSED_REASON_LABEL_ES[rule.pausedReason]}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="relative z-10 text-right">
                  {canMutate && rule.status !== "ended" ? (
                    <RowMenu
                      ruleId={rule.id}
                      status={rule.status}
                      disabled={isPending}
                      onPause={() => runBulk("pause", [rule.id])}
                      onResume={() => runBulk("resume", [rule.id])}
                      onEnd={() => runBulk("end", [rule.id])}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RowMenu({
  ruleId,
  status,
  disabled,
  onPause,
  onResume,
  onEnd,
}: {
  ruleId: string;
  status: RecurringRuleListItem["status"];
  disabled: boolean;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={disabled}
          aria-label="Acciones de la recurrente"
        >
          <MoreHorizontal className="size-4" strokeWidth={1.75} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={`/transactions/recurring/${ruleId}`}>Ver detalle</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {status === "active" ? (
          <DropdownMenuItem onSelect={onPause}>
            <Pause className="size-4" strokeWidth={1.75} aria-hidden />
            Pausar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onResume}>
            <Play className="size-4" strokeWidth={1.75} aria-hidden />
            Reanudar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          onSelect={onEnd}
        >
          <StopCircle className="size-4" strokeWidth={1.75} aria-hidden />
          Finalizar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
