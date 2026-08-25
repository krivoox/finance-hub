import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { SurfaceSection } from "@/components/surface-section";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
  type ActiveWorkspaceContext,
} from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { listGoals } from "@/features/goals/services";
import { NewGoalSheet } from "@/features/goals/components/new-goal-sheet";
import { GoalsList } from "@/features/goals/components/goals-list";
import type { GoalAccountOption } from "@/features/goals/components/account-choice-list";

type GoalsResult = Awaited<ReturnType<typeof listGoals>>;
type AccountsResult = Awaited<ReturnType<typeof listAccounts>>;

function formatTargetDate(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toAccountOptions(accounts: AccountsResult): GoalAccountOption[] {
  return accounts
    .filter((a) => !a.isArchived)
    .map((a) => ({
      id: a.id,
      name: a.name,
      currency: a.currency,
      type: a.type,
    }));
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
          No se pudo cargar tu cuenta. Recargá la página.
        </p>
      </ContentPanel>
    );
  }

  const canMutate = workspace.role !== "viewer";

  const goalsPromise = listGoals({
    userId: session.user.id,
    workspaceId: workspace.id,
    includeCancelled: true,
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

  return (
    <NewGoalSheet
      workspaceId={workspace.id}
      workspaceCurrency={workspace.baseCurrency}
      accounts={toAccountOptions(accountList)}
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

  return (
    <GoalsList
      canMutate={canMutate}
      accounts={toAccountOptions(accountList)}
      goals={goalList.map((goal) => ({
        id: goal.id,
        name: goal.name,
        kind: goal.kind,
        targetAmountCents: goal.targetAmountCents,
        currentAmountCents: goal.currentAmountCents,
        currency: goal.currency,
        targetDate: formatTargetDate(goal.targetDate),
        linkedAccountId: goal.linkedAccountId,
        linkedAccountName: goal.linkedAccountName,
        status: goal.status,
        progressPercent: goal.progressPercent,
      }))}
    />
  );
}

function NewGoalButtonSkeleton() {
  return <Skeleton className="h-10 w-full rounded-xl sm:w-36" />;
}

/**
 * Goals list fallback (SPEC-20): progress rows while the read model streams.
 * Never renders real amounts — money stays fresh.
 */
function GoalsListSkeleton() {
  return (
    <SurfaceSection aria-busy aria-label="Cargando objetivos">
      <ul className="-mx-2 divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="flex flex-col gap-3 px-2 py-4">
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
    </SurfaceSection>
  );
}
