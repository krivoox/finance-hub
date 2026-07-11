import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format-money";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { listGoals } from "@/features/goals/services";
import { NewGoalForm } from "@/features/goals/components/new-goal-form";
import { ContributeGoalForm } from "@/features/goals/components/contribute-goal-form";
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
    >
      <div className="space-y-8">
        {canMutate ? (
          <section className="space-y-3">
            <header>
              <h2 className="text-sm font-semibold text-foreground">
                Nuevo objetivo
              </h2>
              <p className="text-xs text-muted-foreground">
                Definí un monto meta en {workspace.baseCurrency} y, si querés,
                una fecha o cuenta vinculada.
              </p>
            </header>
            <NewGoalForm
              workspaceId={workspace.id}
              workspaceCurrency={workspace.baseCurrency}
              accounts={activeAccounts.map((a) => ({
                id: a.id,
                name: a.name,
              }))}
            />
          </section>
        ) : null}

        <section className="space-y-3">
          <header>
            <h2 className="text-sm font-semibold text-foreground">
              Objetivos actuales
            </h2>
          </header>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay objetivos en este workspace.
            </p>
          ) : (
            <ul className="space-y-6">
              {goals.map((goal) => {
                const targetDate = formatTargetDate(goal.targetDate);
                return (
                  <li
                    key={goal.id}
                    className="rounded-lg border border-border bg-background/40 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground">
                          {goal.name}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {GOAL_KIND_LABEL_ES[goal.kind]}
                          {goal.linkedAccountName
                            ? ` · ${goal.linkedAccountName}`
                            : ""}
                          {targetDate ? ` · meta ${targetDate}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(goal.status)}>
                          {GOAL_STATUS_LABEL_ES[goal.status]}
                        </Badge>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {goal.progressPercent}%
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                      {formatMoney(goal.currentAmountCents, goal.currency)} /{" "}
                      {formatMoney(goal.targetAmountCents, goal.currency)}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={
                          goal.status === "completed"
                            ? "h-full rounded-full bg-success"
                            : "h-full rounded-full bg-info"
                        }
                        style={{ width: `${goal.progressPercent}%` }}
                      />
                    </div>
                    {canMutate && goal.status === "active" ? (
                      <div className="mt-4">
                        <ContributeGoalForm
                          goalId={goal.id}
                          goalCurrency={goal.currency}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </ContentPanel>
  );
}
