import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
} from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { listCategories } from "@/features/categories/services";
import {
  listTransactions,
  listPaymentAccountsForUser,
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
} from "@/features/transactions/lib/list-search-params";
import { listPeriodDescription } from "@/features/transactions/lib/resolve-list-period";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toPageItems(
  items: Awaited<ReturnType<typeof listTransactions>>["items"],
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
    isExternalToWorkspace: tx.isExternalToWorkspace,
    registrationWorkspaceName: tx.registrationWorkspaceName,
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
          Todavía no tenés un workspace. Creá uno para empezar a registrar
          transacciones.
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

  const [accounts, categories, txPage, paymentGroups] = await Promise.all([
    listAccounts({ userId: session.user.id, workspaceId: workspace.id }),
    listCategories({ userId: session.user.id, workspaceId: workspace.id }),
    listTransactions({
      userId: session.user.id,
      workspaceId: workspace.id,
      limit: LIST_PAGE_SIZE,
      from,
      to,
      types,
      accountId: listParams.accountId,
      categoryId: listParams.categoryId,
      cursor: listParams.cursor,
    }),
    canMutate
      ? listPaymentAccountsForUser(session.user.id)
      : Promise.resolve([]),
  ]);

  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const activeCategories = categories.filter((c) => !c.isArchived);

  const contributionAccounts = paymentGroups.flatMap((g) =>
    g.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      currency: a.currency,
      workspaceId: a.workspaceId,
      workspaceName: a.workspaceName,
      workspaceType: a.workspaceType,
    })),
  );

  const createActions = canMutate ? (
    <Suspense
      fallback={
        <Button className="h-10 w-full sm:h-8 sm:w-auto" disabled>
          Registrar
        </Button>
      }
    >
      <TransactionsCreateActions
        workspaceId={workspace.id}
        workspaceCurrency={workspace.baseCurrency}
        accounts={activeAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          workspaceType: workspace.type,
        }))}
        contributionAccounts={contributionAccounts}
      />
    </Suspense>
  ) : undefined;

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
    <ContentPanel
      title="Transacciones"
      description={panelDescription}
      actions={createActions}
    >
      {canMutate && activeAccounts.length === 0 ? (
        <p className="mb-6 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Necesitás al menos una cuenta activa para registrar transacciones.{" "}
          <Link href="/accounts" className="font-medium text-foreground underline">
            Crear cuenta
          </Link>
        </p>
      ) : null}

      <Suspense
        fallback={
          <div className="mb-5 h-9 animate-pulse rounded-full bg-muted/60" />
        }
      >
        <TransactionsListToolbar
          params={listParams}
          accounts={activeAccounts.map((a) => ({ id: a.id, name: a.name }))}
          categories={activeCategories.map((c) => ({
            id: c.id,
            name: c.name,
          }))}
        />
      </Suspense>

      {txPage.items.length === 0 ? (
        <TransactionsEmptyState
          kind={emptyKind}
          params={listParams}
          canMutate={canMutate}
        />
      ) : (
        <TransactionsLedgerList
          key={listKey}
          workspaceId={workspace.id}
          initialItems={toPageItems(txPage.items)}
          initialNextCursor={txPage.nextCursor}
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
    </ContentPanel>
  );
}
