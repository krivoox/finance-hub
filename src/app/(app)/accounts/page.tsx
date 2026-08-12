import { redirect } from "next/navigation";
import Link from "next/link";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { NewAccountSheet } from "@/features/accounts/components/new-account-sheet";
import { AccountsList } from "@/features/accounts/components/accounts-list";

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
    includeArchived: true,
  });

  const canMutate = workspace.role !== "viewer";
  const canSetup =
    workspace.role === "owner" || workspace.role === "admin";

  const activeCount = accounts.filter((a) => !a.isArchived).length;

  const listItems = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    balanceCents: account.currentBalance.amountCents,
    creditLimitCents: account.creditLimitCents,
    isArchived: account.isArchived,
  }));

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
      {activeCount === 0 && accounts.length === 0 ? (
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
      ) : activeCount === 0 ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">
              No hay cuentas activas. Las archivadas quedan al final del
              listado (grisadas): desarchivá una o creá una nueva para seguir
              registrando movimientos.
            </p>
            {canSetup ? (
              <Button asChild className="h-10">
                <Link href="/onboarding">Configurar espacio</Link>
              </Button>
            ) : null}
          </div>
          <AccountsList
            workspaceId={workspace.id}
            canMutate={canMutate}
            accounts={listItems}
          />
        </div>
      ) : (
        <AccountsList
          workspaceId={workspace.id}
          canMutate={canMutate}
          accounts={listItems}
        />
      )}
    </ContentPanel>
  );
}
