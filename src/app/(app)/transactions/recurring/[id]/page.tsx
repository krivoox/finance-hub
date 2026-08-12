import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format-money";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { listCategories } from "@/features/categories/services";
import { getRecurringRule } from "@/features/recurring/services";
import { RecurringDomainError } from "@/features/recurring/domain";
import { EditRecurringSheet } from "@/features/recurring/components/edit-recurring-sheet";
import { LifecycleActions } from "@/features/recurring/components/lifecycle-actions";
import {
  RECURRING_FREQUENCY_LABEL_ES,
  RECURRING_PAUSED_REASON_LABEL_ES,
  RECURRING_STATUS_LABEL_ES,
  RECURRING_TYPE_LABEL_ES,
} from "@/features/recurring/components/labels";

type PageProps = {
  params: Promise<{ id: string }>;
};

type RecurringDetail = Awaited<ReturnType<typeof getRecurringRule>>;
type AccountsResult = Awaited<ReturnType<typeof listAccounts>>;
type CategoriesResult = Awaited<ReturnType<typeof listCategories>>;

function amountVariant(
  type: "income" | "expense" | "transfer",
): "income" | "expense" | "transfer" {
  return type;
}

function statusVariant(
  status: "active" | "paused" | "ended",
): "success" | "warning" | "outline" {
  if (status === "active") return "success";
  if (status === "paused") return "warning";
  return "outline";
}

export default async function RecurringDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  let detail;
  try {
    detail = await getRecurringRule({ userId: session.user.id, ruleId: id });
  } catch (err) {
    if (err instanceof RecurringDomainError) {
      notFound();
    }
    throw err;
  }

  const workspace = await getActiveWorkspaceForUser(session.user.id);
  const canMutate =
    workspace?.id === detail.rule.workspaceId && workspace.role !== "viewer";

  // `detail` (title + body) and the cheap cached `workspace` (for canMutate) are
  // awaited above. The edit sheet needs a second round-trip (accounts +
  // categories); kick those off WITHOUT awaiting so the body paints as soon as
  // the detail resolves while the actions stream behind <Suspense>.
  const accountsPromise = listAccounts({
    userId: session.user.id,
    workspaceId: detail.rule.workspaceId,
  });
  const categoriesPromise = listCategories({
    userId: session.user.id,
    workspaceId: detail.rule.workspaceId,
  });

  const rule = detail.rule;

  return (
    <ContentPanel
      title={rule.name}
      description={`${RECURRING_TYPE_LABEL_ES[rule.type]} · ${RECURRING_FREQUENCY_LABEL_ES[rule.frequency]}`}
      actions={
        canMutate ? (
          <Suspense fallback={<RecurringActionsSkeleton />}>
            <RecurringEditActionsSection
              detail={detail}
              accounts={accountsPromise}
              categories={categoriesPromise}
            />
          </Suspense>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-8">
        <div>
          <Link
            href="/transactions/recurring"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
            Volver a recurrentes
          </Link>
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(rule.status)}>
              {RECURRING_STATUS_LABEL_ES[rule.status]}
            </Badge>
            {rule.pausedReason ? (
              <Badge variant="outline">
                {RECURRING_PAUSED_REASON_LABEL_ES[rule.pausedReason]}
              </Badge>
            ) : null}
            <Badge variant={amountVariant(rule.type)} className="tabular-nums">
              {formatMoney(rule.amountCents, rule.currency)}
            </Badge>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Field label="Cuenta" value={detail.accountName} />
            {rule.type === "transfer" ? (
              <Field
                label="Cuenta destino"
                value={detail.counterpartyAccountName ?? "—"}
              />
            ) : (
              <Field label="Categoría" value={detail.categoryName ?? "—"} />
            )}
            <Field label="Primera fecha" value={rule.startDate} />
            <Field label="Última fecha" value={rule.endDate ?? "Sin fin"} />
            {rule.description ? (
              <Field
                label="Descripción"
                value={rule.description}
                className="sm:col-span-2"
              />
            ) : null}
          </dl>
          <LifecycleActions
            ruleId={rule.id}
            status={rule.status}
            canMutate={canMutate}
            redirectOnEnd="/transactions/recurring"
          />
        </section>

        {rule.status === "active" && detail.nextOccurrences.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              Próximas fechas
            </h2>
            <ul className="flex flex-wrap gap-2">
              {detail.nextOccurrences.map((d) => (
                <li
                  key={d}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-foreground tabular-nums"
                >
                  <CalendarClock
                    className="size-3.5 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  {d}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Últimas transacciones
          </h2>
          {detail.recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no se registró ninguna transacción de esta recurrente.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {detail.recentTransactions.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/transactions/${t.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {t.description ?? "Sin detalle"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t.occurredOn}
                      {t.scheduledOn && t.scheduledOn !== t.occurredOn
                        ? ` · programada ${t.scheduledOn}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-foreground">
                    {formatMoney(t.amountCents, t.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ContentPanel>
  );
}

async function RecurringEditActionsSection({
  detail,
  accounts,
  categories,
}: {
  detail: RecurringDetail;
  accounts: Promise<AccountsResult>;
  categories: Promise<CategoriesResult>;
}) {
  const [accountList, categoryList] = await Promise.all([accounts, categories]);
  const rule = detail.rule;

  const accountOptions = accountList
    .filter((a) => !a.isArchived || a.id === rule.accountId)
    .map((a) => ({ id: a.id, name: a.name, currency: a.currency }));
  const categoryOptions = categoryList
    .filter((c) => c.kind === "income" || c.kind === "expense")
    .map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind as "income" | "expense",
    }));

  return (
    <EditRecurringSheet
      workspaceId={rule.workspaceId}
      workspaceCurrency={rule.currency}
      accounts={accountOptions}
      categories={categoryOptions}
      initial={{
        ruleId: rule.id,
        name: rule.name,
        type: rule.type,
        amountCents: rule.amountCents,
        currency: rule.currency,
        accountId: rule.accountId,
        counterpartyAccountId: rule.counterpartyAccountId,
        categoryId: rule.categoryId,
        description: rule.description,
        frequency: rule.frequency,
        startDate: rule.startDate,
        endDate: rule.endDate,
      }}
    />
  );
}

function RecurringActionsSkeleton() {
  return <Skeleton className="h-10 w-full rounded-full sm:h-8 sm:w-24" />;
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}
