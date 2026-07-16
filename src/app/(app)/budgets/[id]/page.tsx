import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import {
  ProgressBar,
  budgetProgressTone,
} from "@/components/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format-money";
import { getSession } from "@/lib/session";
import {
  BudgetNotFoundError,
} from "@/features/budgets/domain";
import { getBudgetDetail } from "@/features/budgets/services";
import { BUDGET_PERIOD_LABEL_ES } from "@/features/budgets/components/period-labels";
import { ForbiddenError } from "@/features/workspaces/domain";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDateEs(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatOccurredOn(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function statusLabel(status: "on_track" | "warning" | "exceeded"): string {
  if (status === "warning") return "Al límite";
  if (status === "exceeded") return "Excedido";
  return "En curso";
}

export default async function BudgetDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  let detail;
  try {
    detail = await getBudgetDetail({
      userId: session.user.id,
      budgetId: id,
    });
  } catch (err) {
    if (err instanceof BudgetNotFoundError) notFound();
    if (err instanceof ForbiddenError) redirect("/budgets");
    throw err;
  }

  const pct =
    detail.limitCents > 0
      ? Math.round((detail.progress.spentCents / detail.limitCents) * 100)
      : 0;

  const categoriesLabel =
    detail.categoryIds.length === 0
      ? "Todas las categorías de gasto"
      : detail.categoryNames.join(" · ");

  return (
    <ContentPanel
      title={detail.name}
      description={`${BUDGET_PERIOD_LABEL_ES[detail.period]} · ${formatDateEs(detail.progress.periodStart)} – ${formatDateEs(detail.progress.periodEnd)}`}
    >
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          <Link href="/budgets">← Volver a presupuestos</Link>
        </Button>
      </div>

      <div className="space-y-8">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {BUDGET_PERIOD_LABEL_ES[detail.period]}
            </Badge>
            {detail.progress.status !== "on_track" ? (
              <Badge
                variant={
                  detail.progress.status === "exceeded" ? "expense" : "warning"
                }
              >
                {statusLabel(detail.progress.status)}
              </Badge>
            ) : (
              <Badge variant="outline">{statusLabel(detail.progress.status)}</Badge>
            )}
            {detail.isArchived ? (
              <Badge variant="outline">Archivado</Badge>
            ) : null}
          </div>

          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {formatMoney(detail.progress.spentCents, detail.currency)}
            <span className="ml-2 text-lg font-medium text-muted-foreground sm:text-xl">
              de {formatMoney(detail.limitCents, detail.currency)}
            </span>
          </p>

          <ProgressBar
            className="max-w-md"
            size="lg"
            value={pct}
            tone={budgetProgressTone(detail.progress.status)}
            aria-label={`${detail.name}: ${pct}%`}
          />

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-muted-foreground">Restante</dt>
              <dd
                className={`tabular-nums ${
                  detail.progress.remainingCents < 0
                    ? "text-expense"
                    : "text-foreground"
                }`}
              >
                {formatMoney(detail.progress.remainingCents, detail.currency)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Avance</dt>
              <dd className="tabular-nums text-foreground">{pct}%</dd>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-muted-foreground">Categorías</dt>
              <dd className="text-foreground text-pretty">{categoriesLabel}</dd>
            </div>
          </dl>
        </header>

        <section className="space-y-3 border-t border-border pt-6">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              Movimientos del periodo
            </h2>
            <p className="text-xs tabular-nums text-muted-foreground">
              {detail.transactions.length}{" "}
              {detail.transactions.length === 1 ? "gasto" : "gastos"}
            </p>
          </header>

          {detail.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay gastos que sumen a este presupuesto en el periodo
              actual.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {detail.transactions.map((tx) => (
                <li key={tx.id} className="first:pt-0 last:pb-0">
                  <Link
                    href={`/transactions/${tx.id}`}
                    className="flex items-start justify-between gap-3 py-3 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {tx.description ?? tx.categoryName ?? "Gasto"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tx.categoryName ?? "Sin categoría"}
                        {" · "}
                        {tx.accountName}
                        {" · "}
                        <span className="tabular-nums">
                          {formatOccurredOn(tx.occurredOn)}
                        </span>
                      </p>
                    </div>
                    <Badge variant="expense" className="shrink-0 tabular-nums">
                      {formatMoney(tx.amountCents, tx.currency)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ContentPanel>
  );
}
