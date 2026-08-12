import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import {
  ProgressBar,
  goalProgressTone,
} from "@/components/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format-money";
import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
  type ActiveWorkspaceContext,
} from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { listGoals } from "@/features/goals/services";
import { NewGoalSheet } from "@/features/goals/components/new-goal-sheet";
import { ContributeGoalSheet } from "@/features/goals/components/contribute-goal-sheet";
import {
  GOAL_KIND_LABEL_ES,
  GOAL_STATUS_LABEL_ES,
} from "@/features/goals/components/goal-kind-labels";
import type { GoalStatus } from "@/features/goals/domain";

type GoalsResult = Awaited<ReturnType<typeof listGoals>>;
type AccountsResult = Awaited<ReturnType<typeof listAccounts>>;
type AccountOption = { id: string; name: string; currency: string };

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

  const canMutate = workspace.role !== "viewer";

  // Kick off both reads now, but DON'T await here: the chrome (title +
  // description) paints instantly while the "Nuevo objetivo" action and the
  // goals list stream behind their own <Suspense>. The accounts promise is
  // shared so it runs once for both. No money is cached.
  const goalsPromise = listGoals({
    userId: session.user.id,
    workspaceId: workspace.id,
  });
  const accountsPromise = listAccounts({
    userId: session.user.id,
    workspaceId: workspace.id,
  });

  return (
    <ContentPanel
      title="Objetivos"
      description={`Ahorro y pago de deudas en ${workspace.name}.`}
      actions={
        canMutate ? (
          <Suspense fallback={<NewGoalButtonSkeleton />}>
            <GoalsActionsSection
              workspace={workspace}
              accounts={accountsPromise}
            />
          </Suspense>
        ) : undefined
      }
    >
      <Suspense fallback={<GoalsListSkeleton />}>
        <GoalsListSection
          canMutate={canMutate}
          goals={goalsPromise}
          accounts={accountsPromise}
        />
      </Suspense>
    </ContentPanel>
  );
}

async function GoalsActionsSection({
  workspace,
  accounts,
}: {
  workspace: ActiveWorkspaceContext;
  accounts: Promise<AccountsResult>;
}) {
  const accountList = await accounts;
  const activeAccounts = accountList.filter((a) => !a.isArchived);

  return (
    <NewGoalSheet
      workspaceId={workspace.id}
      workspaceCurrency={workspace.baseCurrency}
      accounts={activeAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
      }))}
    />
  );
}

async function GoalsListSection({
  canMutate,
  goals,
  accounts,
}: {
  canMutate: boolean;
  goals: Promise<GoalsResult>;
  accounts: Promise<AccountsResult>;
}) {
  const [goalList, accountList] = await Promise.all([goals, accounts]);
  const activeAccounts = accountList.filter((a) => !a.isArchived);
  const accountOptions: AccountOption[] = activeAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
  }));

  if (goalList.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 py-8 sm:py-12">
        <p className="text-sm text-muted-foreground">
          Aún no hay objetivos. Definí una meta de ahorro o de deuda.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {goalList.map((goal) => {
        const targetDate = formatTargetDate(goal.targetDate);
        return (
          <li
            key={goal.id}
            className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-foreground">{goal.name}</h3>
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
                  linkedAccountId={goal.linkedAccountId}
                  linkedAccountName={goal.linkedAccountName}
                  accounts={accountOptions}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function NewGoalButtonSkeleton() {
  return <Skeleton className="h-10 w-full rounded-full sm:h-8 sm:w-36" />;
}

/**
 * Goals list fallback (SPEC-20): progress rows while the read model streams.
 * Never renders real amounts — money stays fresh.
 */
function GoalsListSkeleton() {
  return (
    <ul className="divide-y divide-border" aria-busy aria-label="Cargando objetivos">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-48 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-3 w-full rounded-full" />
        </li>
      ))}
    </ul>
  );
}
