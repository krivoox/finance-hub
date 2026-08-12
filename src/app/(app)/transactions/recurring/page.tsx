import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
  type ActiveWorkspaceContext,
} from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import {
  listCategories,
  ensureSubscriptionCategories,
} from "@/features/categories/services";
import { getUsdQuotes } from "@/features/fx-quotes/services";
import {
  listPendingOccurrences,
  listRecurringRules,
} from "@/features/recurring/services";
import {
  RecurringCreateActions,
  RecurringTemplatesEmptyCta,
} from "@/features/recurring/components/recurring-create-actions";
import { PendingOccurrencesTable } from "@/features/recurring/components/pending-occurrences-table";
import { RecurringRulesTable } from "@/features/recurring/components/recurring-rules-table";

type RulesResult = Awaited<ReturnType<typeof listRecurringRules>>;
type PendingResult = Awaited<ReturnType<typeof listPendingOccurrences>>;
type AccountsResult = Awaited<ReturnType<typeof listAccounts>>;
type CategoriesResult = Awaited<ReturnType<typeof listCategories>>;
type QuotesResult = Awaited<ReturnType<typeof getUsdQuotes>>;

type AccountOption = { id: string; name: string; currency: string };
type CategoryOption = { id: string; name: string; kind: "income" | "expense" };

function toAccountOptions(accounts: AccountsResult): AccountOption[] {
  return accounts
    .filter((a) => !a.isArchived)
    .map((a) => ({ id: a.id, name: a.name, currency: a.currency }));
}

function toCategoryOptions(categories: CategoriesResult): CategoryOption[] {
  return categories
    .filter((c) => !c.isArchived)
    .filter((c) => c.kind === "income" || c.kind === "expense")
    .map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind as "income" | "expense",
    }));
}

export default async function RecurringHubPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await getActiveWorkspaceForUser(session.user.id);
  if (!workspace) {
    return (
      <ContentPanel
        title="Recurrentes"
        description="Automatizá sueldos, alquiler y suscripciones."
      >
        <p className="text-sm text-muted-foreground">
          Todavía no tenés un workspace. Creá uno para empezar con
          recurrentes.
        </p>
      </ContentPanel>
    );
  }

  const canMutate = workspace.role !== "viewer";

  // Kick off the reads now, but DON'T await here: the chrome (title +
  // description) paints instantly while the "Nueva recurrente" action and the
  // pending/templates lists stream behind their own <Suspense>. Categories chain
  // after ensureSubscriptionCategories so subscription rows exist before listing.
  // Shared promises keep each query to a single run. No money is cached.
  const rulesPromise = listRecurringRules({
    userId: session.user.id,
    workspaceId: workspace.id,
  });
  const pendingPromise = listPendingOccurrences({
    userId: session.user.id,
    workspaceId: workspace.id,
  });
  const accountsPromise = listAccounts({
    userId: session.user.id,
    workspaceId: workspace.id,
  });
  const categoriesPromise = ensureSubscriptionCategories(workspace.id).then(() =>
    listCategories({ userId: session.user.id, workspaceId: workspace.id }),
  );
  const quotesPromise = getUsdQuotes({ seedIfEmpty: false });

  return (
    <ContentPanel
      title="Recurrentes"
      description={`Ingresos, gastos y transferencias recurrentes en ${workspace.name}.`}
      actions={
        canMutate ? (
          <Suspense fallback={<RecurringActionsSkeleton />}>
            <RecurringActionsSection
              workspace={workspace}
              accounts={accountsPromise}
              categories={categoriesPromise}
              quotes={quotesPromise}
            />
          </Suspense>
        ) : undefined
      }
    >
      <Suspense fallback={<RecurringListsSkeleton />}>
        <RecurringListsSection
          workspace={workspace}
          canMutate={canMutate}
          rules={rulesPromise}
          pending={pendingPromise}
          accounts={accountsPromise}
          categories={categoriesPromise}
          quotes={quotesPromise}
        />
      </Suspense>
    </ContentPanel>
  );
}

async function RecurringActionsSection({
  workspace,
  accounts,
  categories,
  quotes,
}: {
  workspace: ActiveWorkspaceContext;
  accounts: Promise<AccountsResult>;
  categories: Promise<CategoriesResult>;
  quotes: Promise<QuotesResult>;
}) {
  const [accountList, categoryList, quotesResult] = await Promise.all([
    accounts,
    categories,
    quotes,
  ]);

  return (
    <RecurringCreateActions
      workspaceId={workspace.id}
      workspaceCurrency={workspace.baseCurrency}
      accounts={toAccountOptions(accountList)}
      categories={toCategoryOptions(categoryList)}
      quotes={quotesResult.enabled ? quotesResult : null}
    />
  );
}

async function RecurringListsSection({
  workspace,
  canMutate,
  rules,
  pending,
  accounts,
  categories,
  quotes,
}: {
  workspace: ActiveWorkspaceContext;
  canMutate: boolean;
  rules: Promise<RulesResult>;
  pending: Promise<PendingResult>;
  accounts: Promise<AccountsResult>;
  categories: Promise<CategoriesResult>;
  quotes: Promise<QuotesResult>;
}) {
  const [ruleList, pendingList, accountList, categoryList, quotesResult] =
    await Promise.all([rules, pending, accounts, categories, quotes]);

  const quotesForUi = quotesResult.enabled ? quotesResult : null;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Por confirmar
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {pendingList.length}
          </span>
        </header>
        <PendingOccurrencesTable items={pendingList} canMutate={canMutate} />
      </section>

      <section className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Plantillas
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {ruleList.length}
          </span>
        </header>
        <RecurringRulesTable
          rules={ruleList}
          canMutate={canMutate}
          emptyAction={
            canMutate ? (
              <RecurringTemplatesEmptyCta
                workspaceId={workspace.id}
                workspaceCurrency={workspace.baseCurrency}
                accounts={toAccountOptions(accountList)}
                categories={toCategoryOptions(categoryList)}
                quotes={quotesForUi}
              />
            ) : undefined
          }
        />
      </section>
    </div>
  );
}

function RecurringActionsSkeleton() {
  return <Skeleton className="h-10 w-full rounded-full sm:h-8 sm:w-40" />;
}

/**
 * Recurring lists fallback (SPEC-20): two section headers + table rows while the
 * read models stream. Never renders real amounts — money stays fresh.
 */
function RecurringListsSkeleton() {
  return (
    <div
      className="flex flex-col gap-10"
      aria-busy
      aria-label="Cargando recurrentes"
    >
      {Array.from({ length: 2 }).map((_, section) => (
        <section key={section} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-6" />
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-3 py-3.5"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-5 w-20 shrink-0" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
