import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { ContentPanel } from "@/components/app-shell/content-panel";
import {
  ProgressBar,
  budgetProgressTone,
} from "@/components/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format-money";
import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
  type ActiveWorkspaceContext,
} from "@/features/workspaces/services";
import {
  listBudgetsWithStatus,
  type BudgetWithProgress,
} from "@/features/budgets/services";
import { listCategories } from "@/features/categories/services";
import { ArchivedBudgetRow } from "@/features/budgets/components/archived-budget-row";
import { BudgetCategoryPills } from "@/features/budgets/components/budget-category-pills";
import { NewBudgetSheet } from "@/features/budgets/components/new-budget-sheet";
import { BUDGET_PERIOD_LABEL_ES } from "@/features/budgets/components/period-labels";

type BudgetsResult = Awaited<ReturnType<typeof listBudgetsWithStatus>>;
type CategoriesResult = Awaited<ReturnType<typeof listCategories>>;

function formatDateEs(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ActiveBudgetRow({
  budget,
  categoryNameById,
}: {
  budget: BudgetWithProgress;
  categoryNameById: Readonly<Record<string, string>>;
}) {
  const { progress } = budget;
  const pct =
    budget.limitCents > 0
      ? Math.round((progress.spentCents / budget.limitCents) * 100)
      : 0;

  return (
    <li className="relative flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/budgets/${budget.id}`}
            className="font-medium text-foreground after:absolute after:inset-0 hover:underline"
          >
            {budget.name}
          </Link>
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
        <BudgetCategoryPills
          className="mt-1.5"
          categoryIds={budget.categoryIds}
          categoryNameById={categoryNameById}
        />
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {formatMoney(progress.spentCents, budget.currency)} de{" "}
          {formatMoney(budget.limitCents, budget.currency)} ·{" "}
          {formatDateEs(progress.periodStart)} –{" "}
          {formatDateEs(progress.periodEnd)}
        </p>
        <ProgressBar
          className="mt-2 w-full sm:max-w-md"
          value={pct}
          tone={budgetProgressTone(progress.status)}
          aria-label={`${budget.name}: ${pct}%`}
        />
      </div>
      <p className="relative z-10 text-sm tabular-nums text-muted-foreground sm:text-right">
        {pct}%
      </p>
    </li>
  );
}

function ArchivedSection({
  budgets,
  canMutate,
  emphasize,
  categoryNameById,
}: {
  budgets: BudgetWithProgress[];
  canMutate: boolean;
  /** When there are no actives, archived is the primary surface — denser intro. */
  emphasize: boolean;
  categoryNameById: Readonly<Record<string, string>>;
}) {
  return (
    <section
      className={
        emphasize
          ? "flex flex-col gap-3"
          : "flex flex-col gap-3 border-t border-border pt-6"
      }
      aria-labelledby="budgets-archived-heading"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2
            id="budgets-archived-heading"
            className="text-sm font-medium text-foreground"
          >
            Archivados
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {budgets.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-pretty">
          {emphasize
            ? "Conservan el historial; al desarchivar vuelven a la lista activa."
            : canMutate
              ? "No cuentan en el badge de atención. Podés desarchivarlos cuando quieras."
              : "No cuentan en el badge de atención."}
        </p>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-dashed border-border px-3 sm:px-4">
        {budgets.map((budget) => (
          <ArchivedBudgetRow
            key={budget.id}
            budget={budget}
            canMutate={canMutate}
            categoryNameById={categoryNameById}
          />
        ))}
      </ul>
    </section>
  );
}

function BudgetsEmpty({ canMutate }: { canMutate: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2 py-6 sm:py-8">
      <p className="text-sm font-medium text-foreground">
        Todavía no hay presupuestos
      </p>
      <p className="max-w-md text-sm text-muted-foreground text-pretty">
        {canMutate
          ? "Definí un límite para el periodo y cuidá el gasto en categorías clave."
          : "Cuando alguien del workspace cree uno, va a aparecer acá."}
      </p>
    </div>
  );
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

  const canMutate = workspace.role !== "viewer";

  // Kick off both reads now, but DON'T await here: the chrome (title +
  // description) paints instantly while the "Nuevo presupuesto" action and the
  // list stream behind their own <Suspense>. Sharing the categories promise
  // keeps it to a single run even though actions + list both consume it. No
  // money is cached — this only reorders when blocks paint.
  const budgetsPromise = listBudgetsWithStatus({
    userId: session.user.id,
    workspaceId: workspace.id,
    includeArchived: true,
  });
  const categoriesPromise = listCategories({
    userId: session.user.id,
    workspaceId: workspace.id,
    // Resolve names for linked categories even if later archived.
    includeArchived: true,
  });

  return (
    <ContentPanel
      title="Presupuestos"
      description={`Límites del periodo en curso en ${workspace.name}.`}
      actions={
        canMutate ? (
          <Suspense fallback={<NewBudgetButtonSkeleton />}>
            <BudgetsActionsSection
              workspace={workspace}
              categories={categoriesPromise}
            />
          </Suspense>
        ) : undefined
      }
    >
      <Suspense fallback={<BudgetsListSkeleton />}>
        <BudgetsListSection
          canMutate={canMutate}
          budgets={budgetsPromise}
          categories={categoriesPromise}
        />
      </Suspense>
    </ContentPanel>
  );
}

async function BudgetsActionsSection({
  workspace,
  categories,
}: {
  workspace: ActiveWorkspaceContext;
  categories: Promise<CategoriesResult>;
}) {
  const categoryList = await categories;
  const expenseCategories = categoryList.filter(
    (c) => c.kind === "expense" && !c.isArchived,
  );

  return (
    <NewBudgetSheet
      workspaceId={workspace.id}
      workspaceCurrency={workspace.baseCurrency}
      categories={expenseCategories.map((c) => ({
        id: c.id,
        name: c.name,
      }))}
    />
  );
}

async function BudgetsListSection({
  canMutate,
  budgets,
  categories,
}: {
  canMutate: boolean;
  budgets: Promise<BudgetsResult>;
  categories: Promise<CategoriesResult>;
}) {
  const [budgetList, categoryList] = await Promise.all([budgets, categories]);

  const active = budgetList.filter((b) => !b.isArchived);
  const archived = budgetList.filter((b) => b.isArchived);
  const categoryNameById = Object.fromEntries(
    categoryList.map((c) => [c.id, c.name]),
  );
  const onlyArchived = active.length === 0 && archived.length > 0;
  const trulyEmpty = active.length === 0 && archived.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {trulyEmpty ? <BudgetsEmpty canMutate={canMutate} /> : null}

      {onlyArchived ? (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 px-3 py-3 sm:px-4">
          <p className="text-sm font-medium text-foreground">
            Ningún presupuesto activo
          </p>
          <p className="text-sm text-muted-foreground text-pretty">
            {canMutate
              ? "Los de abajo están archivados: desarchivalos para seguir el gasto, o creá uno nuevo."
              : "Los de abajo están archivados. Abrí uno para ver el historial."}
          </p>
        </div>
      ) : null}

      {active.length > 0 ? (
        <section
          className="flex flex-col gap-3"
          aria-labelledby="budgets-active-heading"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2
              id="budgets-active-heading"
              className="text-sm font-medium text-foreground"
            >
              Activos
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {active.length}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {active.map((budget) => (
              <ActiveBudgetRow
                key={budget.id}
                budget={budget}
                categoryNameById={categoryNameById}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {archived.length > 0 ? (
        <ArchivedSection
          budgets={archived}
          canMutate={canMutate}
          emphasize={onlyArchived}
          categoryNameById={categoryNameById}
        />
      ) : null}
    </div>
  );
}

function NewBudgetButtonSkeleton() {
  return <Skeleton className="h-10 w-full rounded-full sm:h-8 sm:w-40" />;
}

/**
 * Budgets list fallback (SPEC-20): header + progress rows while the read model
 * streams. Never renders real amounts — money stays fresh.
 */
function BudgetsListSkeleton() {
  return (
    <div
      className="flex flex-col gap-3"
      aria-busy
      aria-label="Cargando presupuestos"
    >
      <div className="flex items-baseline justify-between gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-6" />
      </div>
      <ul className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-56 max-w-full" />
            <Skeleton className="h-2 w-full max-w-md rounded-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}
