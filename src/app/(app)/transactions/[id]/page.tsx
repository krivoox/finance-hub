import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSignedMoney, formatMoney } from "@/lib/format-money";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { listAccounts } from "@/features/accounts/services";
import { listCategories } from "@/features/categories/services";
import { getTransactionDetail } from "@/features/transactions/services";
import { EditTransactionForm } from "@/features/transactions/components/edit-transaction-form";
import { TRANSACTION_TYPE_LABEL_ES } from "@/features/transactions/components/transaction-type-labels";
import {
  formatPaymentAccountLabel,
  TransactionNotFoundError,
  type TransactionType,
} from "@/features/transactions/domain";
import { ForbiddenError } from "@/features/workspaces/domain";
import { requireMembership } from "@/features/workspaces/services";

type PageProps = {
  params: Promise<{ id: string }>;
};

function signedAmountCents(type: TransactionType, amountCents: number): number {
  if (type === "income") return amountCents;
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
  const userId = session.user.id;

  let detail;
  try {
    detail = await getTransactionDetail({ userId, transactionId: id });
  } catch (err) {
    if (err instanceof TransactionNotFoundError) notFound();
    if (err instanceof ForbiddenError) redirect("/transactions");
    throw err;
  }

  const [accounts, categories, membership, personalOwner] = await Promise.all([
    listAccounts({ userId, workspaceId: detail.workspaceId }),
    listCategories({ userId, workspaceId: detail.workspaceId }),
    requireMembership(userId, detail.workspaceId),
    detail.accountWorkspaceType === "personal"
      ? prisma.membership.findFirst({
          where: {
            workspaceId: detail.accountWorkspaceId,
            role: "owner",
          },
          select: {
            userId: true,
            user: {
              select: { displayName: true, name: true, email: true },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const canMutate = membership.role !== "viewer";

  const accountLabel = formatPaymentAccountLabel({
    viewerUserId: userId,
    accountName: detail.accountName,
    accountWorkspaceId: detail.accountWorkspaceId,
    registrationWorkspaceId: detail.workspaceId,
    accountWorkspaceName: detail.accountWorkspaceName,
    accountWorkspaceType: detail.accountWorkspaceType,
    personalOwnerUserId: personalOwner?.userId ?? null,
    personalOwnerDisplayName:
      personalOwner?.user.displayName?.trim() ||
      personalOwner?.user.name ||
      personalOwner?.user.email ||
      null,
  });

  const transferLabel =
    detail.type === "transfer" && detail.counterpartyAccountName
      ? `${detail.accountName} → ${detail.counterpartyAccountName}`
      : accountLabel;

  const accountOptions = accounts
    .filter((a) => !a.isArchived)
    .map((a) => ({ id: a.id, name: a.name, currency: a.currency }));

  if (
    detail.isExternallyFunded &&
    !accountOptions.some((a) => a.id === detail.accountId)
  ) {
    accountOptions.unshift({
      id: detail.accountId,
      name: `${detail.accountWorkspaceName} · ${detail.accountName}`,
      currency: detail.currency,
    });
  }

  return (
    <ContentPanel
      title="Detalle del movimiento"
      description={detail.workspaceName}
    >
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/transactions">← Volver a movimientos</Link>
        </Button>
      </div>

      <div className="space-y-8">
        <header className="space-y-2">
          <Badge variant={detail.type}>
            {TRANSACTION_TYPE_LABEL_ES[detail.type]}
          </Badge>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {formatSignedMoney(
              signedAmountCents(detail.type, detail.amountCents),
              detail.currency,
            )}
          </p>
          <p className="text-base text-foreground">
            {detail.description ??
              detail.categoryName ??
              TRANSACTION_TYPE_LABEL_ES[detail.type]}
          </p>
        </header>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Fecha</dt>
            <dd className="tabular-nums text-foreground">
              {formatOccurredOn(detail.occurredOn)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {detail.type === "income"
                ? "Se acredita en"
                : detail.type === "expense"
                  ? "Se descuenta de"
                  : "Cuentas"}
            </dt>
            <dd className="text-foreground">{transferLabel}</dd>
          </div>
          {detail.type !== "transfer" ? (
            <div>
              <dt className="text-muted-foreground">Categoría</dt>
              <dd className="text-foreground">{detail.categoryName ?? "—"}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Se registra en</dt>
            <dd className="text-foreground">{detail.workspaceName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Registró</dt>
            <dd className="text-foreground">{detail.createdByDisplayName}</dd>
          </div>
          {detail.isExternallyFunded ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Origen del dinero</dt>
              <dd className="text-foreground">
                Cuenta de {detail.accountWorkspaceName} (otro espacio)
              </dd>
            </div>
          ) : null}
        </dl>

        {detail.split ? (
          <section className="space-y-3 border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-foreground">Reparto</h2>
            <p className="text-sm text-muted-foreground">
              Pagó {detail.split.paidByDisplayName} · método{" "}
              {detail.split.method}
            </p>
            <ul className="divide-y divide-border rounded-md border border-border">
              {detail.split.shares.map((s) => (
                <li
                  key={s.userId}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{s.displayName}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatMoney(s.shareCents, detail.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {detail.crossWorkspaceLink ? (
          <section className="space-y-2 border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-foreground">
              {detail.crossWorkspaceLink.kind === "contribution"
                ? "Aporte vinculado"
                : "Movimiento vinculado"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {detail.crossWorkspaceLink.role === "source"
                ? "Entra en"
                : "Sale de"}{" "}
              {detail.crossWorkspaceLink.twinWorkspaceName}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/transactions/${detail.crossWorkspaceLink.twinTransactionId}`}
              >
                Ver movimiento vinculado
              </Link>
            </Button>
          </section>
        ) : null}

        {canMutate ? (
          <section className="space-y-3 border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-foreground">Editar</h2>
            <EditTransactionForm
              transactionId={detail.id}
              type={detail.type}
              amountCents={detail.amountCents}
              currency={detail.currency}
              occurredOn={formatOccurredOn(detail.occurredOn)}
              description={detail.description}
              categoryId={detail.categoryId}
              accountId={detail.accountId}
              counterpartyAccountId={detail.counterpartyAccountId}
              accounts={accountOptions}
              categories={categories
                .filter((c) => !c.isArchived)
                .map((c) => ({
                  id: c.id,
                  name: c.name,
                  kind: c.kind,
                }))}
            />
          </section>
        ) : null}
      </div>
    </ContentPanel>
  );
}
