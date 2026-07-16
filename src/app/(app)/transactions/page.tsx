import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSignedMoney } from "@/lib/format-money";
import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
  listMembers,
} from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { listCategories } from "@/features/categories/services";
import {
  listTransactions,
  listPaymentAccountsForUser,
} from "@/features/transactions/services";
import { TransactionsCreateActions } from "@/features/transactions/components/transactions-create-actions";
import type { TransactionType } from "@/features/transactions/domain";

function amountVariant(
  type: TransactionType,
): "income" | "expense" | "transfer" {
  return type;
}

function signedAmountCents(
  type: TransactionType,
  amountCents: number,
): number {
  if (type === "income") return amountCents;
  if (type === "expense") return -amountCents;
  return -amountCents;
}

function formatOccurredOn(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await getActiveWorkspaceForUser(session.user.id);
  if (!workspace) {
    return (
      <ContentPanel
        title="Movimientos"
        description="Ingresos, gastos y transferencias."
      >
        <p className="text-sm text-muted-foreground">
          Todavía no tenés un workspace. Creá uno para empezar a registrar
          movimientos.
        </p>
      </ContentPanel>
    );
  }

  const canMutate = workspace.role !== "viewer";

  const [accounts, categories, txPage, members, paymentGroups] =
    await Promise.all([
      listAccounts({ userId: session.user.id, workspaceId: workspace.id }),
      listCategories({ userId: session.user.id, workspaceId: workspace.id }),
      listTransactions({
        userId: session.user.id,
        workspaceId: workspace.id,
        limit: 50,
      }),
      workspace.type === "group"
        ? listMembers(session.user.id, workspace.id)
        : Promise.resolve([]),
      canMutate
        ? listPaymentAccountsForUser(session.user.id)
        : Promise.resolve([]),
    ]);

  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const groupMembers =
    workspace.type === "group"
      ? members.map((m) => ({
          userId: m.userId,
          displayName:
            m.user.displayName?.trim() || m.user.name || m.user.email,
        }))
      : [];

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
        workspaceName={workspace.name}
        workspaceCurrency={workspace.baseCurrency}
        accounts={activeAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          workspaceType: workspace.type,
        }))}
        paymentAccountGroups={paymentGroups.map((g) => ({
          workspaceId: g.workspaceId,
          workspaceName: g.workspaceName,
          workspaceType: g.workspaceType,
          accounts: g.accounts.map((a) => ({
            id: a.id,
            name: a.name,
            currency: a.currency,
            workspaceId: a.workspaceId,
            workspaceName: a.workspaceName,
            workspaceType: a.workspaceType,
          })),
        }))}
        categories={categories
          .filter((c) => !c.isArchived)
          .map((c) => ({
            id: c.id,
            name: c.name,
            kind: c.kind,
          }))}
        groupMembers={groupMembers}
        currentUserId={session.user.id}
        contributionAccounts={contributionAccounts}
      />
    </Suspense>
  ) : undefined;

  return (
    <ContentPanel
      title="Movimientos"
      description={`Ingresos, gastos y transferencias de ${workspace.name}.`}
      actions={createActions}
    >
      {canMutate && activeAccounts.length === 0 ? (
        <p className="mb-6 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Necesitás al menos una cuenta activa para registrar movimientos.{" "}
          <Link href="/accounts" className="font-medium text-foreground underline">
            Crear cuenta
          </Link>
        </p>
      ) : null}

      {txPage.items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-8 sm:py-12">
          <p className="text-sm text-muted-foreground">
            Todavía no hay movimientos. Registrá el primero cuando quieras.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="hidden sm:table-cell">Cuenta</TableHead>
              <TableHead className="hidden md:table-cell">Categoría</TableHead>
              <TableHead className="hidden lg:table-cell">Registró</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txPage.items.map((tx) => {
              const accountLabel =
                tx.type === "transfer" && tx.counterpartyAccountName
                  ? `${tx.accountName} → ${tx.counterpartyAccountName}`
                  : tx.isExternalToWorkspace && tx.registrationWorkspaceName
                    ? `${tx.registrationWorkspaceName} · ${tx.accountName}`
                    : tx.accountName;
              const categoryLabel =
                tx.type === "transfer"
                  ? "Transferencia"
                  : (tx.categoryName ?? "—");
              const description =
                tx.description ??
                (tx.type === "transfer"
                  ? "Transferencia"
                  : (tx.categoryName ?? "Movimiento"));
              const descriptionWithChip = tx.isExternalToWorkspace
                ? `${tx.registrationWorkspaceName ?? "Otro espacio"} · ${description}`
                : description;
              return (
                <TableRow key={tx.id} className="relative">
                  <TableCell>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="font-medium text-foreground after:absolute after:inset-0 hover:underline"
                      >
                        {descriptionWithChip}
                      </Link>
                      <span className="text-xs text-muted-foreground sm:hidden">
                        {accountLabel}
                        {" · "}
                        {formatOccurredOn(tx.occurredOn)}
                      </span>
                      {tx.accountWorkspaceId !== workspace.id &&
                      !tx.isExternalToWorkspace ? (
                        <span className="text-xs text-muted-foreground">
                          Pagado desde otro espacio
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {accountLabel}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {categoryLabel}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {tx.createdByDisplayName}
                  </TableCell>
                  <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                    {formatOccurredOn(tx.occurredOn)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={amountVariant(tx.type)}
                      className="tabular-nums"
                    >
                      {formatSignedMoney(
                        signedAmountCents(tx.type, tx.amountCents),
                        tx.currency,
                      )}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </ContentPanel>
  );
}
