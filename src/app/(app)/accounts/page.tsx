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
import { formatMoney } from "@/lib/format-money";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { NewAccountSheet } from "@/features/accounts/components/new-account-sheet";
import { ACCOUNT_TYPE_LABEL_ES } from "@/features/accounts/components/account-type-labels";

export default async function AccountsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await getActiveWorkspaceForUser(session.user.id);
  if (!workspace) {
    return (
      <ContentPanel
        title="Cuentas"
        description="Saldos de bancos, billeteras y tarjetas."
      >
        <p className="text-sm text-muted-foreground">
          Todavía no tenés un workspace. Creá uno para empezar a registrar
          cuentas.
        </p>
      </ContentPanel>
    );
  }

  const accounts = await listAccounts({
    userId: session.user.id,
    workspaceId: workspace.id,
  });

  const canMutate = workspace.role !== "viewer";

  return (
    <ContentPanel
      title="Cuentas"
      description={`Saldos de bancos, billeteras y tarjetas en ${workspace.name}.`}
      actions={
        canMutate ? (
          <NewAccountSheet
            workspaceId={workspace.id}
            workspaceCurrency={workspace.baseCurrency}
          />
        ) : undefined
      }
    >
      {accounts.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-8 sm:py-12">
          <p className="text-sm text-muted-foreground">
            Aún no hay cuentas en este workspace. Creá la primera para empezar a
            registrar movimientos.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => {
              const isCreditDebt =
                account.type === "credit_card" &&
                account.currentBalance.amountCents > 0;
              const isNegative = account.currentBalance.amountCents < 0;
              return (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium text-foreground">
                        {account.name}
                      </span>
                      <span className="text-xs text-muted-foreground sm:hidden">
                        {ACCOUNT_TYPE_LABEL_ES[account.type]}
                        {" · "}
                        {account.currency}
                      </span>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {account.currency}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">
                      {ACCOUNT_TYPE_LABEL_ES[account.type]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium tabular-nums ${
                      isNegative || isCreditDebt
                        ? "text-expense"
                        : "text-foreground"
                    }`}
                  >
                    {formatMoney(
                      account.currentBalance.amountCents,
                      account.currentBalance.currency,
                    )}
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
