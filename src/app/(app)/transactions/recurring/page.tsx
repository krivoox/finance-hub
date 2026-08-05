import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { listCategories } from "@/features/categories/services";
import {
  listPendingOccurrences,
  listRecurringRules,
} from "@/features/recurring/services";
import { NewRecurringSheet } from "@/features/recurring/components/new-recurring-sheet";
import { PendingOccurrencesTable } from "@/features/recurring/components/pending-occurrences-table";
import { RecurringRulesTable } from "@/features/recurring/components/recurring-rules-table";

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

  const [rules, pending, accounts, categories] = await Promise.all([
    listRecurringRules({
      userId: session.user.id,
      workspaceId: workspace.id,
    }),
    listPendingOccurrences({
      userId: session.user.id,
      workspaceId: workspace.id,
    }),
    listAccounts({ userId: session.user.id, workspaceId: workspace.id }),
    listCategories({ userId: session.user.id, workspaceId: workspace.id }),
  ]);

  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const activeCategories = categories.filter((c) => !c.isArchived);

  const accountOptions = activeAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
  }));
  const categoryOptions = activeCategories
    .filter((c) => c.kind === "income" || c.kind === "expense")
    .map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind as "income" | "expense",
    }));

  return (
    <ContentPanel
      title="Recurrentes"
      description={`Ingresos, gastos y transferencias recurrentes en ${workspace.name}.`}
      actions={
        canMutate ? (
          <NewRecurringSheet
            workspaceId={workspace.id}
            workspaceCurrency={workspace.baseCurrency}
            accounts={accountOptions}
            categories={categoryOptions}
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-3">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">
              Por confirmar
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {pending.length}
            </span>
          </header>
          <PendingOccurrencesTable items={pending} canMutate={canMutate} />
        </section>

        <section className="flex flex-col gap-3">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">
              Plantillas
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {rules.length}
            </span>
          </header>
          <RecurringRulesTable rules={rules} canMutate={canMutate} />
        </section>
      </div>
    </ContentPanel>
  );
}
