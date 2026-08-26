"use client";

import { useMemo, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pause,
  Play,
  StopCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  AbmTable,
  AbmHead,
  AbmCell,
  AbmMoney,
  AbmRowHitLink,
  ABM_STRETCH_LINK_CLASS,
} from "@/components/abm-table";
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
import {
  endRecurringRuleAction,
  pauseRecurringRuleAction,
  resumeRecurringRuleAction,
} from "@/features/recurring/actions";
import type { RecurringRuleListItem } from "@/features/recurring/services";
import { signedLedgerAmountCents } from "@/features/transactions/domain";

import {
  RECURRING_FREQUENCY_LABEL_ES,
  RECURRING_PAUSED_REASON_LABEL_ES,
  RECURRING_STATUS_LABEL_ES,
  RECURRING_TYPE_LABEL_ES,
} from "./labels";

type RecurringRulesTableProps = {
  rules: readonly RecurringRuleListItem[];
  canMutate: boolean;
  /** Extra CTA rendered inside the empty state (e.g. template gallery). */
  emptyAction?: ReactNode;
};

function amountVariant(
  type: RecurringRuleListItem["type"],
): "income" | "expense" | "transfer" {
  if (type === "income") return "income";
  if (type === "expense") return "expense";
  return "transfer";
}

function signedAmountCents(
  type: RecurringRuleListItem["type"],
  amountCents: number,
): number {
  return signedLedgerAmountCents(type, amountCents);
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
  emptyAction,
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
          suscripciones. También podés partir de Netflix, Spotify y otras.
        </p>
        {emptyAction}
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
    <AbmTable
      bulk={
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
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={isPending}
            onClick={() => runBulk("end", selection.selectedIds)}
          >
            <StopCircle className="size-3.5" strokeWidth={1.75} aria-hidden />
            Finalizar
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
                label="Seleccionar todas las plantillas"
              />
            ) : null}
            <AbmHead slot="identity">Descripción</AbmHead>
            <AbmHead hideBelow="md">Categoría</AbmHead>
            <AbmHead hideBelow="lg">Cuenta</AbmHead>
            <AbmHead slot="amount">Monto</AbmHead>
            <AbmHead hideBelow="sm">Frecuencia</AbmHead>
            <AbmHead hideBelow="sm">Fecha de cobro</AbmHead>
            <AbmHead hideBelow="md">Ejecutada</AbmHead>
            <AbmHead hideBelow="sm">Estado</AbmHead>
            <AbmHead slot="action">
              <span className="sr-only">Acciones</span>
            </AbmHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => {
            const selectable = canMutate && rule.status !== "ended";
            const tone = amountVariant(rule.type);
            return (
              <TableRow
                key={rule.id}
                data-state={
                  selection.isSelected(rule.id) ? "selected" : undefined
                }
                className="border-border/60"
              >
                {canMutate ? (
                  <SelectRowCell
                    selection={selection}
                    id={rule.id}
                    disabled={!selectable}
                    label={`Seleccionar ${rule.name}`}
                  />
                ) : null}
                <AbmCell slot="identity">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link
                      href={`/transactions/recurring/${rule.id}`}
                      className={`min-w-0 truncate font-medium text-foreground ${ABM_STRETCH_LINK_CLASS}`}
                    >
                      {rule.name}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground sm:hidden">
                      {RECURRING_STATUS_LABEL_ES[rule.status]}
                      {" · "}
                      {RECURRING_FREQUENCY_LABEL_ES[rule.frequency]}
                      {rule.nextOccurrence
                        ? ` · ${formatDateOnly(rule.nextOccurrence)}`
                        : ""}
                    </span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:block md:hidden">
                      {RECURRING_TYPE_LABEL_ES[rule.type]} ·{" "}
                      {accountLabel(rule)}
                    </span>
                  </div>
                </AbmCell>
                <AbmCell hideBelow="md">
                  <CategoryPill
                    label={categoryLabel(rule)}
                    toneSeed={rule.categoryId}
                  />
                </AbmCell>
                <AbmCell hideBelow="lg" muted>
                  {accountLabel(rule)}
                </AbmCell>
                <AbmCell slot="amount">
                  <AbmRowHitLink href={`/transactions/recurring/${rule.id}`} />
                  <AbmMoney
                    cents={signedAmountCents(rule.type, rule.amountCents)}
                    currency={rule.currency}
                    tone={tone}
                  />
                </AbmCell>
                <AbmCell hideBelow="sm" muted>
                  {RECURRING_FREQUENCY_LABEL_ES[rule.frequency]}
                </AbmCell>
                <AbmCell hideBelow="sm">
                  {rule.nextOccurrence ? (
                    <Badge variant="success" className="tabular-nums font-normal">
                      {formatDateOnly(rule.nextOccurrence)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </AbmCell>
                <AbmCell hideBelow="md" muted>
                  {executedLabel(rule.materializedCount)}
                </AbmCell>
                <AbmCell hideBelow="sm">
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
                </AbmCell>
                <AbmCell slot="action">
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
                </AbmCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </AbmTable>
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
          size="icon-sm"
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
