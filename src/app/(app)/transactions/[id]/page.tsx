import Link from "next/link";
import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { PageSkeleton } from "@/components/app-shell/page-skeleton";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSignedMoney, formatMoney } from "@/lib/format-money";
import { formatDateOnly } from "@/lib/format-date";
import { getSession } from "@/lib/session";
import { listAccounts } from "@/features/accounts/services";
import { listCategories } from "@/features/categories/services";
import { getTransactionDetail } from "@/features/transactions/services";
import { EditTransactionSheet } from "@/features/transactions/components/edit-transaction-sheet";
import { TRANSACTION_TYPE_LABEL_ES } from "@/features/transactions/components/transaction-type-labels";
import {
  TransactionNotFoundError,
  type TransactionType,
} from "@/features/transactions/domain";
import { ForbiddenError } from "@/features/workspaces/domain";
import { requireMembership } from "@/features/workspaces/services";

type PageProps = {
  params: Promise<{ id: string }>;
};

function badgeVariantForType(
  type: TransactionType,
): "income" | "expense" | "transfer" {
  if (type === "income" || type === "fx_credit") return "income";
  if (type === "expense" || type === "fx_debit") return "expense";
  return "transfer";
}

function signedAmountCents(type: TransactionType, amountCents: number): number {
  if (type === "income" || type === "fx_credit") return amountCents;
  return -amountCents;
}

function formatOccurredOn(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <TransactionDetailBody userId={session.user.id} transactionId={id} />
    </Suspense>
  );
}

async function TransactionDetailBody({
  userId,
  transactionId,
}: {
  userId: string;
  transactionId: string;
}) {
  let detail;
  try {
    detail = await getTransactionDetail({ userId, transactionId });
  } catch (err) {
    if (err instanceof TransactionNotFoundError) notFound();
    if (err instanceof ForbiddenError) redirect("/transactions");
    throw err;
  }

  const [accounts, categories, membership] = await Promise.all([
    listAccounts({ userId, workspaceId: detail.workspaceId }),
    listCategories({ userId, workspaceId: detail.workspaceId }),
    requireMembership(userId, detail.workspaceId),
  ]);

  const canMutate = membership.role !== "viewer";

  const accountLabel = detail.accountName;

  const transferLabel =
    detail.type === "transfer" && detail.counterpartyAccountName
      ? `${detail.accountName} → ${detail.counterpartyAccountName}`
      : accountLabel;

  const accountOptions = accounts
    .filter((a) => !a.isArchived)
    .map((a) => ({ id: a.id, name: a.name, currency: a.currency }));

  const title =
    detail.description ??
    detail.categoryName ??
    TRANSACTION_TYPE_LABEL_ES[detail.type];

  return (
    <ContentPanel
      title={title}
      description={`${detail.workspaceName} · ${formatDateOnly(detail.occurredOn)}`}
      actions={
        canMutate ? (
          <EditTransactionSheet
            transactionId={detail.id}
            workspaceId={detail.workspaceId}
            type={detail.type}
            amountCents={detail.amountCents}
            currency={detail.currency}
            occurredOn={formatOccurredOn(detail.occurredOn)}
            description={detail.description}
            categoryId={detail.categoryId}
            accountId={detail.accountId}
            counterpartyAccountId={detail.counterpartyAccountId}
            linkedToGoal={detail.goalContribution !== null}
            accounts={accountOptions}
            categories={categories
              .filter((c) => !c.isArchived)
              .map((c) => ({
                id: c.id,
                name: c.name,
                kind: c.kind,
              }))}
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5 sm:gap-6">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link href="/transactions">← Volver a movimientos</Link>
          </Button>
        </div>

        <SurfaceSection>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={badgeVariantForType(detail.type)}>
              {TRANSACTION_TYPE_LABEL_ES[detail.type]}
            </Badge>
            {detail.goalContribution ? (
              <Badge variant="info">
                {detail.goalContribution.goalKind === "debt_payoff"
                  ? "Pago de deuda"
                  : "Aporte a objetivo"}
              </Badge>
            ) : null}
          </div>
          <p className="mt-4 font-heading text-3xl font-extrabold tabular tracking-tight text-foreground sm:text-4xl">
            {formatSignedMoney(
              signedAmountCents(detail.type, detail.amountCents),
              detail.currency,
            )}
          </p>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Fecha
              </dt>
              <dd className="tabular text-foreground">
                {formatDateOnly(detail.occurredOn)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                {detail.type === "income" || detail.type === "fx_credit"
                  ? "Se acredita en"
                  : detail.type === "expense" || detail.type === "fx_debit"
                    ? "Se descuenta de"
                    : "Cuentas"}
              </dt>
              <dd className="text-foreground">{transferLabel}</dd>
            </div>
            {detail.type !== "transfer" ? (
              <div className="space-y-1">
                <dt className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                  Categoría
                </dt>
                <dd className="text-foreground">{detail.categoryName ?? "—"}</dd>
              </div>
            ) : null}
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Se registra en
              </dt>
              <dd className="text-foreground">{detail.workspaceName}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Registró
              </dt>
              <dd className="text-foreground">{detail.createdByDisplayName}</dd>
            </div>
          </dl>
        </SurfaceSection>

        {detail.goalContribution ? (
          <SurfaceSection>
            <SurfaceHeader
              title={
                detail.goalContribution.goalKind === "debt_payoff"
                  ? "Pago de deuda"
                  : "Aporte a objetivo"
              }
            />
            <p className="text-sm text-muted-foreground">
              {detail.goalContribution.goalName}
            </p>
            <Button variant="outline" className="mt-3" asChild>
              <Link href="/goals">Ver objetivos</Link>
            </Button>
          </SurfaceSection>
        ) : null}

        {detail.split ? (
          <SurfaceSection>
            <SurfaceHeader title={`Reparto en «${detail.split.splitGroupName}»`} />
            <p className="mb-3 text-sm text-muted-foreground">
              Pagó {detail.split.paidByDisplayName}
            </p>
            <ul className="-mx-2 divide-y divide-border">
              {detail.split.shares.map((s) => (
                <li
                  key={s.memberId}
                  className="flex items-center justify-between gap-3 px-2 py-2.5 text-sm"
                >
                  <span className="text-foreground">{s.displayName}</span>
                  <span className="tabular text-muted-foreground">
                    {formatMoney(s.shareCents, detail.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="mt-3" asChild>
              <Link href={`/groups/${detail.split.splitGroupId}`}>
                Ver grupo
              </Link>
            </Button>
          </SurfaceSection>
        ) : null}
      </div>
    </ContentPanel>
  );
}
