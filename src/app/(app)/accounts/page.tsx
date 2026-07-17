import { redirect } from "next/navigation";
import Link from "next/link";

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
import { formatMoney } from "@/lib/format-money";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { NewAccountSheet } from "@/features/accounts/components/new-account-sheet";
import { ACCOUNT_TYPE_LABEL_ES } from "@/features/accounts/components/account-type-labels";
import type { AccountWithBalance } from "@/features/accounts/services";

function groupAccountsByCurrency(
  accounts: AccountWithBalance[],
): { currency: string; accounts: AccountWithBalance[] }[] {
  const map = new Map<string, AccountWithBalance[]>();
  for (const account of accounts) {
    const list = map.get(account.currency) ?? [];
    list.push(account);
    map.set(account.currency, list);
  }
  const order = (c: string) => (c === "ARS" ? 0 : c === "USD" ? 1 : 2);
  return [...map.entries()]
    .sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0]))
    .map(([currency, items]) => ({ currency, accounts: items }));
}

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
          Todavía no tenés un espacio. Creá uno para empezar a registrar
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
  const canSetup =
    workspace.role === "owner" || workspace.role === "admin";

  const groups = groupAccountsByCurrency(accounts);

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
        <div className="flex flex-col items-start gap-4 py-8 sm:py-12">
          <p className="text-sm text-muted-foreground">
            Todavía no hay cuentas. Creá una en pesos o en dólares para
            empezar a registrar movimientos.
          </p>
          {canSetup ? (
            <Button asChild className="h-10">
              <Link href="/onboarding">Configurar espacio</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.currency} aria-label={`Cuentas ${group.currency}`}>
              <div className="mb-3 flex items-center gap-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group.currency === "USD" ? "Dólares" : group.currency === "ARS" ? "Pesos" : group.currency}
                </p>
                <Badge
                  variant={group.currency === "USD" ? "info" : "outline"}
                  className="h-5 px-1.5 text-xs"
                >
                  {group.currency}
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.accounts.map((account) => {
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
            </section>
          ))}
        </div>
      )}
    </ContentPanel>
  );
}
