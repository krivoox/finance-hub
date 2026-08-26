import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react";

import { ContentPanel } from "@/components/app-shell/content-panel";
import {
  ProgressBar,
  budgetProgressTone,
} from "@/components/progress-bar";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
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

function ActiveBudgetCard({
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
  const remainingTone =
    progress.status === "exceeded" ? "text-expense" : "text-muted-foreground";

  return (
    <SurfaceSection className="relative">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/budgets/${budget.id}`}
              className="font-heading text-sm font-extrabold text-foreground after:absolute after:inset-0 hover:underline"
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
        </div>
        <p className="relative z-10 shrink-0 text-sm tabular text-muted-foreground sm:text-right">
          {pct}%
        </p>
      </div>

      <ProgressBar
        className="mt-3"
        value={pct}
        tone={budgetProgressTone(progress.status)}
        aria-label={`${budget.name}: ${pct}%`}
      />

      <div className="mt-2 flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
        <span className={`tabular ${remainingTone}`}>
          {formatMoney(progress.spentCents, budget.currency)} de{" "}
          {formatMoney(budget.limitCents, budget.currency)}
        </span>
        <span className="tabular">
          {formatDateEs(progress.periodStart)} –{" "}
          {formatDateEs(progress.periodEnd)}
        </span>
      </div>
    </SurfaceSection>
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
    <SurfaceSection muted={!emphasize} aria-label="Archivados">
      <SurfaceHeader
        title="Archivados"
        description={
          emphasize
            ? "Conservan el historial; al desarchivar vuelven a la lista activa."
            : canMutate
              ? "No cuentan en el badge de atención. Podés desarchivarlos cuando quieras."
              : "No cuentan en el badge de atención."
        }
        action={
          <span className="text-xs tabular text-muted-foreground">
            {budgets.length}
          </span>
        }
      />
      <ul className="-mx-2 divide-y divide-border">
        {budgets.map((budget) => (
          <ArchivedBudgetRow
            key={budget.id}
            budget={budget}
            canMutate={canMutate}
            categoryNameById={categoryNameById}
          />
        ))}
      </ul>
    </SurfaceSection>
  );
}

function BudgetsEmpty({ canMutate }: { canMutate: boolean }) {
  return (
    <SurfaceSection>
      <div className="flex flex-col items-start gap-3 py-2">
        <span
          className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
          aria-hidden
        >
          <Wallet className="size-5" strokeWidth={1.75} />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Todavía no hay presupuestos
          </p>
          <p className="max-w-md text-sm text-muted-foreground text-pretty">
            {canMutate
              ? "Definí un límite para el periodo y cuidá el gasto en categorías clave."
              : "Cuando alguien del workspace cree uno, va a aparecer acá."}
          </p>
        </div>
      </div>
    </SurfaceSection>
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
          No se pudo cargar tu cuenta. Recargá la página.
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
        <SurfaceSection muted>
          <p className="text-sm font-medium text-foreground">
            Ningún presupuesto activo
          </p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {canMutate
              ? "Los de abajo están archivados: desarchivalos para seguir el gasto, o creá uno nuevo."
              : "Los de abajo están archivados. Abrí uno para ver el historial."}
          </p>
        </SurfaceSection>
      ) : null}

      {active.length > 0 ? (
        <section className="flex flex-col gap-4" aria-labelledby="budgets-active-heading">
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <h2
              id="budgets-active-heading"
              className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase"
            >
              Activos
            </h2>
            <span className="text-xs tabular text-muted-foreground">
              {active.length}
            </span>
          </div>
          <ul className="flex flex-col gap-4">
            {active.map((budget) => (
              <li key={budget.id}>
                <ActiveBudgetCard
                  budget={budget}
                  categoryNameById={categoryNameById}
                />
              </li>
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
  return <Skeleton className="h-10 w-full rounded-xl sm:w-40" />;
}

/**
 * Budgets list fallback (SPEC-20): header + progress cards while the read model
 * streams. Never renders real amounts — money stays fresh.
 */
function BudgetsListSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy
      aria-label="Cargando presupuestos"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <SurfaceSection key={i}>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-2 w-full rounded-full" />
          <div className="mt-2 flex justify-between gap-3">
            <Skeleton className="h-3 w-40 max-w-[50%]" />
            <Skeleton className="h-3 w-24" />
          </div>
        </SurfaceSection>
      ))}
    </div>
  );
}
