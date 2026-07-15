import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import {
  ProgressBar,
  budgetProgressTone,
} from "@/components/progress-bar";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format-money";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listBudgetsWithStatus } from "@/features/budgets/services";
import { listCategories } from "@/features/categories/services";
import { NewBudgetForm } from "@/features/budgets/components/new-budget-form";
import { BUDGET_PERIOD_LABEL_ES } from "@/features/budgets/components/period-labels";

function formatDateEs(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function BudgetsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await getActiveWorkspaceForUser(session.user.id);
  if (!workspace) {
    return (
      <ContentPanel
        title="Presupuestos"
        description="Límites del periodo en curso."
      >
        <p className="text-sm text-muted-foreground">
          Todavía no tenés un workspace. Creá uno para empezar a definir
          presupuestos.
        </p>
      </ContentPanel>
    );
  }

  const [budgets, categories] = await Promise.all([
    listBudgetsWithStatus({
      userId: session.user.id,
      workspaceId: workspace.id,
    }),
    listCategories({
      userId: session.user.id,
      workspaceId: workspace.id,
    }),
  ]);

  const expenseCategories = categories.filter((c) => c.kind === "expense");
  const canMutate = workspace.role !== "viewer";

  return (
    <ContentPanel
      title="Presupuestos"
      description={`Límites del periodo en curso en ${workspace.name}.`}
    >
      <div className="space-y-8">
        {canMutate ? (
          <section className="space-y-3">
            <header>
              <h2 className="text-sm font-semibold text-foreground">
                Nuevo presupuesto
              </h2>
              <p className="text-xs text-muted-foreground">
                Elegí periodo, límite en {workspace.baseCurrency} y opcionalmente
                una o más categorías (vacío = todas las de gasto).
              </p>
            </header>
            <NewBudgetForm
              workspaceId={workspace.id}
              workspaceCurrency={workspace.baseCurrency}
              categories={expenseCategories.map((c) => ({
                id: c.id,
                name: c.name,
              }))}
            />
          </section>
        ) : null}

        <section className="space-y-3">
          <header>
            <h2 className="text-sm font-semibold text-foreground">
              Presupuestos activos
            </h2>
          </header>
          {budgets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay presupuestos en este workspace.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {budgets.map((budget) => {
                const { progress } = budget;
                const pct =
                  budget.limitCents > 0
                    ? Math.round(
                        (progress.spentCents / budget.limitCents) * 100,
                      )
                    : 0;
                return (
                  <li
                    key={budget.id}
                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {budget.name}
                        </p>
                        <Badge variant="secondary">
                          {BUDGET_PERIOD_LABEL_ES[budget.period]}
                        </Badge>
                        {progress.status === "warning" ? (
                          <Badge variant="warning">Al límite</Badge>
                        ) : null}
                        {progress.status === "exceeded" ? (
                          <Badge variant="expense">Excedido</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {formatMoney(progress.spentCents, budget.currency)} de{" "}
                        {formatMoney(budget.limitCents, budget.currency)} ·
                        {" "}
                        {formatDateEs(progress.periodStart)} –
                        {" "}
                        {formatDateEs(progress.periodEnd)}
                      </p>
                      <ProgressBar
                        className="mt-2 w-full sm:max-w-md"
                        value={pct}
                        tone={budgetProgressTone(progress.status)}
                        aria-label={`${budget.name}: ${pct}%`}
                      />
                    </div>
                    <p className="text-sm tabular-nums text-muted-foreground sm:text-right">
                      {pct}%
                    </p>
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
