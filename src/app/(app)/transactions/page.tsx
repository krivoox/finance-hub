import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
} from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { listCategories } from "@/features/categories/services";
import {
  listTransactions,
  sumFilteredTransactions,
} from "@/features/transactions/services";
import {
  InvalidDateRangeError,
  LIST_PAGE_SIZE,
  resolveListPeriod,
  resolveListTypeFilter,
} from "@/features/transactions/domain";
import { TransactionsCreateActions } from "@/features/transactions/components/transactions-create-actions";
import { TransactionsEmptyState } from "@/features/transactions/components/transactions-empty-state";
import { TransactionsListToolbar } from "@/features/transactions/components/transactions-list-toolbar";
import { TransactionsLedgerList } from "@/features/transactions/components/transactions-ledger-list";
import type { ListedTransactionPageItem } from "@/features/transactions/actions";
import {
  formatRangeChipLabel,
  hasNonPeriodFilters,
  parseTransactionListSearchParams,
  resolveTransactionsEmptyKind,
  type TransactionListParams,
} from "@/features/transactions/lib/list-search-params";
import { listPeriodDescription } from "@/features/transactions/lib/resolve-list-period";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type AccountsResult = Awaited<ReturnType<typeof listAccounts>>;
type CategoriesResult = Awaited<ReturnType<typeof listCategories>>;
type TxPageResult = Awaited<ReturnType<typeof listTransactions>>;
type TotalsResult = Awaited<ReturnType<typeof sumFilteredTransactions>>;

function toPageItems(
  items: TxPageResult["items"],
): ListedTransactionPageItem[] {
  return items.map((tx) => ({
    id: tx.id,
    workspaceId: tx.workspaceId,
    type: tx.type,
    amountCents: tx.amountCents,
    currency: tx.currency,
    occurredOn: tx.occurredOn.toISOString(),
    description: tx.description,
    categoryId: tx.categoryId,
    accountId: tx.accountId,
    counterpartyAccountId: tx.counterpartyAccountId,
    createdByUserId: tx.createdByUserId,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    accountName: tx.accountName,
    accountWorkspaceId: tx.accountWorkspaceId,
    counterpartyAccountName: tx.counterpartyAccountName,
    categoryName: tx.categoryName,
    createdByDisplayName: tx.createdByDisplayName,
    goalContribution: tx.goalContribution,
    recurring: tx.recurring,
  }));
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [rawParams, profile] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);

  const listParams = parseTransactionListSearchParams(rawParams);

  const workspace = await getActiveWorkspaceForUser(session.user.id);
  if (!workspace) {
    return (
      <ContentPanel
        title="Transacciones"
        description="Ingresos, gastos y transferencias."
      >
        <p className="text-sm text-muted-foreground">
          No se pudo cargar tu cuenta. Recargá la página.
        </p>
      </ContentPanel>
    );
  }

  const canMutate = workspace.role !== "viewer";
  const timezone = profile?.timezone ?? "UTC";
  const now = new Date();

  let resolvedPeriod;
  try {
    resolvedPeriod = resolveListPeriod({
      period: listParams.period,
      from: listParams.from,
      to: listParams.to,
      now,
      timezone,
    });
  } catch (err) {
    // Crafted invalid custom URL → soft fallback to this month (domain still throws).
    if (err instanceof InvalidDateRangeError) {
      resolvedPeriod = resolveListPeriod({
        period: "this_month",
        now,
        timezone,
      });
    } else {
      throw err;
    }
  }

  const from =
    resolvedPeriod.kind === "bounded" ? resolvedPeriod.from : undefined;
  const to = resolvedPeriod.kind === "bounded" ? resolvedPeriod.to : undefined;
  const types = resolveListTypeFilter(listParams.type);

  const rangeLabel =
    listParams.period === "custom" && listParams.from && listParams.to
      ? formatRangeChipLabel(listParams.from, listParams.to)
      : undefined;

  const panelDescription = `${listPeriodDescription(listParams.period, rangeLabel)} · ${workspace.name}`;

  const listFilter = {
    userId: session.user.id,
    workspaceId: workspace.id,
    from,
    to,
    types,
    accountId: listParams.accountId,
    categoryId: listParams.categoryId,
  };

  // Kick off the heavy reads now, but DON'T await here: the chrome (title +
  // description + actions shell) paints immediately while the ledger streams
  // behind a real <Suspense>. Shared promises keep each query to one run even
  // though actions + ledger both need accounts. No money is cached.
  const accountsPromise = listAccounts({
    userId: session.user.id,
    workspaceId: workspace.id,
  });
  const categoriesPromise = listCategories({
    userId: session.user.id,
    workspaceId: workspace.id,
  });
  const txPagePromise = listTransactions({
    ...listFilter,
    limit: LIST_PAGE_SIZE,
    cursor: listParams.cursor,
  });
  const totalsPromise = sumFilteredTransactions(listFilter);

  const createActions = canMutate ? (
    <Suspense
      fallback={
        <Button className="w-full sm:w-auto" disabled>
          Registrar
        </Button>
      }
    >
      <TransactionsActionsSection
        workspace={workspace}
        accounts={accountsPromise}
      />
    </Suspense>
  ) : undefined;

  return (
    <ContentPanel
      title="Transacciones"
      description={panelDescription}
      actions={createActions}
    >
      <Suspense fallback={<TransactionsLedgerSkeleton />}>
        <TransactionsLedgerSection
          workspace={workspace}
          canMutate={canMutate}
          listParams={listParams}
          from={from}
          to={to}
          accounts={accountsPromise}
          categories={categoriesPromise}
          txPage={txPagePromise}
          totals={totalsPromise}
        />
      </Suspense>
    </ContentPanel>
  );
}

type ActiveWorkspace = NonNullable<
  Awaited<ReturnType<typeof getActiveWorkspaceForUser>>
>;

async function TransactionsActionsSection({
  workspace,
  accounts,
}: {
  workspace: ActiveWorkspace;
  accounts: Promise<AccountsResult>;
}) {
  const accountList = await accounts;
  const activeAccounts = accountList.filter((a) => !a.isArchived);

  return (
    <TransactionsCreateActions
      workspaceId={workspace.id}
      accounts={activeAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
      }))}
    />
  );
}

async function TransactionsLedgerSection({
  workspace,
  canMutate,
  listParams,
  from,
  to,
  accounts,
  categories,
  txPage,
  totals,
}: {
  workspace: ActiveWorkspace;
  canMutate: boolean;
  listParams: TransactionListParams;
  from?: string;
  to?: string;
  accounts: Promise<AccountsResult>;
  categories: Promise<CategoriesResult>;
  txPage: Promise<TxPageResult>;
  totals: Promise<TotalsResult>;
}) {
  const [accountList, categoryList, txPageResult, filteredTotals] =
    await Promise.all([accounts, categories, txPage, totals]);

  const activeAccounts = accountList.filter((a) => !a.isArchived);
  const activeCategories = categoryList.filter((c) => !c.isArchived);

  const denseFilters = hasNonPeriodFilters(listParams);
  const emptyKind = resolveTransactionsEmptyKind(listParams, denseFilters);

  const listKey = [
    listParams.period,
    listParams.from ?? "",
    listParams.to ?? "",
    listParams.type,
    listParams.accountId ?? "",
    listParams.categoryId ?? "",
    listParams.cursor ?? "",
  ].join("|");

  return (
    <>
      {canMutate && activeAccounts.length === 0 ? (
        <p className="mb-6 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Necesitás al menos una cuenta activa para registrar transacciones.{" "}
          <Link href="/accounts" className="font-medium text-foreground underline">
            Crear cuenta
          </Link>
        </p>
      ) : null}

      <TransactionsListToolbar
        params={listParams}
        accounts={activeAccounts.map((a) => ({ id: a.id, name: a.name }))}
        categories={activeCategories.map((c) => ({
          id: c.id,
          name: c.name,
        }))}
      />

      {txPageResult.items.length === 0 ? (
        <TransactionsEmptyState
          kind={emptyKind}
          params={listParams}
          canMutate={canMutate}
        />
      ) : (
        <TransactionsLedgerList
          key={listKey}
          workspaceId={workspace.id}
          initialItems={toPageItems(txPageResult.items)}
          initialNextCursor={txPageResult.nextCursor}
          totals={filteredTotals}
          canMutate={canMutate}
          accounts={activeAccounts.map((a) => ({
            id: a.id,
            name: a.name,
            currency: a.currency,
          }))}
          categories={activeCategories.map((c) => ({
            id: c.id,
            name: c.name,
            kind: c.kind as "income" | "expense",
          }))}
          query={{
            workspaceId: workspace.id,
            type: listParams.type,
            accountId: listParams.accountId,
            categoryId: listParams.categoryId,
            from,
            to,
          }}
        />
      )}
    </>
  );
}

/**
 * Ledger fallback (SPEC-20 H1): toolbar chip row + row placeholders while the
 * transactions read model streams in. Never renders real amounts.
 */
function TransactionsLedgerSkeleton() {
  return (
    <div aria-busy aria-label="Cargando movimientos">
      <div className="mb-5 flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
        <Skeleton className="ml-auto h-9 w-24 rounded-xl" />
      </div>
      <div className="mb-4 rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
        <Skeleton className="h-3 w-40" />
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}
