import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import {
  ProgressBar,
  goalProgressTone,
} from "@/components/progress-bar";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format-money";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { listGoals } from "@/features/goals/services";
import { NewGoalSheet } from "@/features/goals/components/new-goal-sheet";
import { ContributeGoalSheet } from "@/features/goals/components/contribute-goal-sheet";
import {
  GOAL_KIND_LABEL_ES,
  GOAL_STATUS_LABEL_ES,
} from "@/features/goals/components/goal-kind-labels";
import type { GoalStatus } from "@/features/goals/domain";

function statusVariant(
  status: GoalStatus,
): "success" | "outline" | "secondary" {
  if (status === "completed") return "success";
  if (status === "cancelled") return "outline";
  return "secondary";
}

function formatTargetDate(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function GoalsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await getActiveWorkspaceForUser(session.user.id);
  if (!workspace) {
    return (
      <ContentPanel
        title="Objetivos"
        description="Ahorro con meta y progreso."
      >
        <p className="text-sm text-muted-foreground">
          Todavía no tenés un workspace. Creá uno para empezar a fijar
          objetivos.
        </p>
      </ContentPanel>
    );
  }

  const [goals, accounts] = await Promise.all([
    listGoals({ userId: session.user.id, workspaceId: workspace.id }),
    listAccounts({ userId: session.user.id, workspaceId: workspace.id }),
  ]);

  const canMutate = workspace.role !== "viewer";
  const activeAccounts = accounts.filter((a) => !a.isArchived);

  return (
    <ContentPanel
      title="Objetivos"
      description={`Ahorro y pago de deudas en ${workspace.name}.`}
      actions={
        canMutate ? (
          <NewGoalSheet
            workspaceId={workspace.id}
            workspaceCurrency={workspace.baseCurrency}
            accounts={activeAccounts.map((a) => ({
              id: a.id,
              name: a.name,
              currency: a.currency,
            }))}
          />
        ) : undefined
      }
    >
      {goals.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-8 sm:py-12">
          <p className="text-sm text-muted-foreground">
            Aún no hay objetivos. Definí una meta de ahorro o de deuda.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {goals.map((goal) => {
            const targetDate = formatTargetDate(goal.targetDate);
            return (
              <li
                key={goal.id}
                className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-foreground">
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
                        : ""}
                      {targetDate ? ` · meta ${targetDate}` : ""}
                    </p>
                    <p className="mt-2 text-sm tabular-nums text-muted-foreground">
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
                  {canMutate && goal.status === "active" ? (
                    <ContributeGoalSheet
                      goalId={goal.id}
                      goalName={goal.name}
                      goalCurrency={goal.currency}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ContentPanel>
  );
}
