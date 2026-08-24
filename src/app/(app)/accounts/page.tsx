import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react";

import { ContentPanel } from "@/components/app-shell/content-panel";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { NewAccountSheet } from "@/features/accounts/components/new-account-sheet";
import { AccountsList } from "@/features/accounts/components/accounts-list";

type AccountsResult = Awaited<ReturnType<typeof listAccounts>>;

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

  const canMutate = workspace.role !== "viewer";
  const canSetup = workspace.role === "owner" || workspace.role === "admin";

  // Kick off the balances read now, but DON'T await here: the chrome (title +
  // description + "Nueva cuenta" action) only needs the cheap workspace context,
  // so it paints instantly while the account list streams behind <Suspense>.
  // No money is cached — this only reorders when the list paints.
  const accountsPromise = listAccounts({
    userId: session.user.id,
    workspaceId: workspace.id,
    includeArchived: true,
  });

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
      <Suspense fallback={<AccountsListSkeleton />}>
        <AccountsListSection
          workspaceId={workspace.id}
          canMutate={canMutate}
          canSetup={canSetup}
          accounts={accountsPromise}
        />
      </Suspense>
    </ContentPanel>
  );
}

async function AccountsListSection({
  workspaceId,
  canMutate,
  canSetup,
  accounts,
}: {
  workspaceId: string;
  canMutate: boolean;
  canSetup: boolean;
  accounts: Promise<AccountsResult>;
}) {
  const accountList = await accounts;

  const activeCount = accountList.filter((a) => !a.isArchived).length;

  const listItems = accountList.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    balanceCents: account.currentBalance.amountCents,
    creditLimitCents: account.creditLimitCents,
    isArchived: account.isArchived,
  }));

  if (activeCount === 0 && accountList.length === 0) {
    return (
      <SurfaceSection>
        <div className="flex flex-col items-start gap-3 py-2">
          <span
            className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
            aria-hidden
          >
            <Wallet className="size-5" strokeWidth={1.75} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Todavía no hay cuentas
            </p>
            <p className="text-sm text-muted-foreground text-pretty">
              Creá una en pesos o en dólares para empezar a registrar
              movimientos.
            </p>
          </div>
          {canSetup ? (
            <Button variant="outline" asChild>
              <Link href="/onboarding">Configurar espacio</Link>
            </Button>
          ) : null}
        </div>
      </SurfaceSection>
    );
  }

  if (activeCount === 0) {
    return (
      <div className="flex flex-col gap-5 sm:gap-6">
        <SurfaceSection muted>
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm font-medium text-foreground">
              No hay cuentas activas
            </p>
            <p className="text-sm text-muted-foreground text-pretty">
              Las archivadas quedan al final del listado (grisadas): desarchivá
              una o creá una nueva para seguir registrando movimientos.
            </p>
            {canSetup ? (
              <Button variant="outline" asChild>
                <Link href="/onboarding">Configurar espacio</Link>
              </Button>
            ) : null}
          </div>
        </SurfaceSection>
        <AccountsList
          workspaceId={workspaceId}
          canMutate={canMutate}
          accounts={listItems}
        />
      </div>
    );
  }

  return (
    <AccountsList
      workspaceId={workspaceId}
      canMutate={canMutate}
      accounts={listItems}
    />
  );
}

/**
 * Accounts list fallback (SPEC-20): row placeholders while the balances read
 * model streams in. Never renders real amounts — money stays fresh.
 */
function AccountsListSkeleton() {
  return (
    <SurfaceSection aria-busy aria-label="Cargando cuentas">
      <SurfaceHeader title="Cuentas" />
      <ul className="-mx-2 divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-2 py-2.5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-24 shrink-0" />
          </li>
        ))}
      </ul>
    </SurfaceSection>
  );
}
