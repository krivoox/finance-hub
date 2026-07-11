import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Badge } from "@/components/ui/badge";
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
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { listCategories } from "@/features/categories/services";
import { listTransactions } from "@/features/transactions/services";
import { NewTransactionForm } from "@/features/transactions/components/new-transaction-form";
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
  return -amountCents; // transfer displayed as leaving origin
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

  const [accounts, categories, txPage] = await Promise.all([
    listAccounts({ userId: session.user.id, workspaceId: workspace.id }),
    listCategories({ userId: session.user.id, workspaceId: workspace.id }),
    listTransactions({
      userId: session.user.id,
      workspaceId: workspace.id,
      limit: 50,
    }),
  ]);

  const canMutate = workspace.role !== "viewer";
  const activeAccounts = accounts.filter((a) => !a.isArchived);

  return (
    <ContentPanel
      title="Movimientos"
      description={`Ingresos, gastos y transferencias de ${workspace.name}.`}
    >
      <div className="space-y-8">
        {canMutate ? (
          <section className="space-y-3">
            <header>
              <h2 className="text-sm font-semibold text-foreground">
                Nuevo movimiento
              </h2>
              <p className="text-xs text-muted-foreground">
                Registrá un gasto, ingreso o transferencia en{" "}
                {workspace.baseCurrency}.
              </p>
            </header>
            {activeAccounts.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                Necesitás al menos una cuenta activa para registrar movimientos.
              </p>
            ) : (
              <NewTransactionForm
                workspaceId={workspace.id}
                workspaceCurrency={workspace.baseCurrency}
                accounts={activeAccounts.map((a) => ({
                  id: a.id,
                  name: a.name,
                  currency: a.currency,
                }))}
                categories={categories
                  .filter((c) => !c.isArchived)
                  .map((c) => ({
                    id: c.id,
                    name: c.name,
                    kind: c.kind,
                  }))}
              />
            )}
          </section>
        ) : null}

        <section className="space-y-3">
          <header>
            <h2 className="text-sm font-semibold text-foreground">
              Historial reciente
            </h2>
          </header>
          {txPage.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay movimientos registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txPage.items.map((tx) => {
                  const accountLabel =
                    tx.type === "transfer" && tx.counterpartyAccountName
                      ? `${tx.accountName} → ${tx.counterpartyAccountName}`
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
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium text-foreground">
                        {description}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {accountLabel}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {categoryLabel}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
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
        </section>
      </div>
    </ContentPanel>
  );
}
