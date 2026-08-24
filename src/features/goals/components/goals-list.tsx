"use client";

import { useState } from "react";
import { MoreHorizontal, Target } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import {
  ProgressBar,
  goalProgressTone,
} from "@/components/progress-bar";
import {
  SurfaceSection,
} from "@/components/surface-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/format-money";
import type { GoalKind, GoalStatus } from "@/features/goals/domain";
import type { GoalAccountOption } from "./account-choice-list";
import { ContributeGoalSheet } from "./contribute-goal-sheet";
import { EditGoalForm } from "./edit-goal-form";
import {
  CancelGoalDialog,
  CompleteGoalDialog,
  DeleteGoalDialog,
} from "./goal-lifecycle-dialogs";
import {
  GOAL_KIND_LABEL_ES,
  GOAL_STATUS_LABEL_ES,
} from "./goal-kind-labels";

export type GoalsListItem = {
  id: string;
  name: string;
  kind: GoalKind;
  targetAmountCents: number;
  currentAmountCents: number;
  currency: string;
  targetDate: string | null;
  linkedAccountId: string | null;
  linkedAccountName: string | null;
  status: GoalStatus;
  progressPercent: number;
};

type GoalsListProps = {
  canMutate: boolean;
  goals: readonly GoalsListItem[];
  accounts: readonly GoalAccountOption[];
};

type GoalActionTarget = {
  id: string;
  name: string;
  kind: GoalKind;
  targetAmountCents: number;
  currentAmountCents: number;
  currency: string;
  targetDate: string | null;
  linkedAccountId: string | null;
  status: GoalStatus;
};

function statusVariant(
  status: GoalStatus,
): "success" | "outline" | "secondary" {
  if (status === "completed") return "success";
  if (status === "cancelled") return "outline";
  return "secondary";
}

export function GoalsList({ canMutate, goals, accounts }: GoalsListProps) {
  const [editTarget, setEditTarget] = useState<GoalActionTarget | null>(null);
  const [cancelTarget, setCancelTarget] = useState<GoalActionTarget | null>(
    null,
  );
  const [completeTarget, setCompleteTarget] =
    useState<GoalActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GoalActionTarget | null>(
    null,
  );

  if (goals.length === 0) {
    return (
      <SurfaceSection>
        <div className="flex flex-col items-start gap-3 py-2">
          <span
            className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
            aria-hidden
          >
            <Target className="size-5" strokeWidth={1.75} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Aún no hay objetivos
            </p>
            <p className="text-sm text-muted-foreground text-pretty">
              Definí una meta de ahorro o de deuda para seguir el progreso.
            </p>
          </div>
        </div>
      </SurfaceSection>
    );
  }

  return (
    <>
      <SurfaceSection>
        <ul className="-mx-2 divide-y divide-border">
          {goals.map((goal) => {
            const target: GoalActionTarget = {
              id: goal.id,
              name: goal.name,
              kind: goal.kind,
              targetAmountCents: goal.targetAmountCents,
              currentAmountCents: goal.currentAmountCents,
              currency: goal.currency,
              targetDate: goal.targetDate,
              linkedAccountId: goal.linkedAccountId,
              status: goal.status,
            };
            const isCancelled = goal.status === "cancelled";

            return (
              <li key={goal.id} className="min-w-0 px-2 py-4 first:pt-1 last:pb-1">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={
                          isCancelled
                            ? "font-heading text-sm font-extrabold text-muted-foreground"
                            : "font-heading text-sm font-extrabold text-foreground"
                        }
                      >
                        {goal.name}
                      </h3>
                      <Badge variant={statusVariant(goal.status)}>
                        {GOAL_STATUS_LABEL_ES[goal.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {GOAL_KIND_LABEL_ES[goal.kind]}
                      {goal.linkedAccountName
                        ? ` · ${goal.linkedAccountName}`
                        : " · sin cuenta vinculada"}
                      {goal.targetDate ? ` · meta ${goal.targetDate}` : ""}
                    </p>
                    <p className="mt-2 text-sm tabular text-muted-foreground">
                      {formatMoney(goal.currentAmountCents, goal.currency)} /{" "}
                      {formatMoney(goal.targetAmountCents, goal.currency)}
                      <span className="ml-2 text-foreground">
                        {goal.progressPercent}%
                      </span>
                    </p>
                    <ProgressBar
                      className="mt-2"
                      size="lg"
                      value={goal.progressPercent}
                      tone={
                        goal.status === "completed"
                          ? "success"
                          : goalProgressTone(goal.progressPercent)
                      }
                      aria-label={`${goal.name}: ${goal.progressPercent}%`}
                    />
                  </div>
                  {canMutate ? (
                    <div className="flex items-center gap-1">
                      {goal.status === "active" ? (
                        <ContributeGoalSheet
                          goalId={goal.id}
                          goalName={goal.name}
                          goalCurrency={goal.currency}
                          linkedAccountId={goal.linkedAccountId}
                          linkedAccountName={goal.linkedAccountName}
                          accounts={accounts}
                        />
                      ) : null}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Acciones de ${goal.name}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44">
                          {goal.status !== "cancelled" ? (
                            <DropdownMenuItem
                              onSelect={() => setEditTarget(target)}
                            >
                              Editar
                            </DropdownMenuItem>
                          ) : null}
                          {goal.status === "active" ? (
                            <DropdownMenuItem
                              onSelect={() => setCompleteTarget(target)}
                            >
                              Marcar completado
                            </DropdownMenuItem>
                          ) : null}
                          {goal.status !== "cancelled" ? (
                            <DropdownMenuItem
                              onSelect={() => setCancelTarget(target)}
                            >
                              Cancelar
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleteTarget(target)}
                          >
                            Eliminar permanentemente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </SurfaceSection>

      <FormSheet
        open={editTarget != null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        title="Editar objetivo"
        description="Cambiá nombre, meta, fecha o la cuenta donde entra el aporte."
        size="md"
      >
        {editTarget ? (
          <EditGoalForm
            key={editTarget.id}
            goal={{
              id: editTarget.id,
              name: editTarget.name,
              kind: editTarget.kind,
              targetAmountCents: editTarget.targetAmountCents,
              currentAmountCents: editTarget.currentAmountCents,
              currency: editTarget.currency,
              targetDate: editTarget.targetDate,
              linkedAccountId: editTarget.linkedAccountId,
            }}
            accounts={accounts}
            onSuccess={() => setEditTarget(null)}
            onCancel={() => setEditTarget(null)}
          />
        ) : null}
      </FormSheet>

      {cancelTarget ? (
        <CancelGoalDialog
          open
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null);
          }}
          goalId={cancelTarget.id}
          goalName={cancelTarget.name}
        />
      ) : null}

      {completeTarget ? (
        <CompleteGoalDialog
          open
          onOpenChange={(open) => {
            if (!open) setCompleteTarget(null);
          }}
          goalId={completeTarget.id}
          goalName={completeTarget.name}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteGoalDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          goalId={deleteTarget.id}
          goalName={deleteTarget.name}
        />
      ) : null}
    </>
  );
}
