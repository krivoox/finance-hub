import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { SurfaceSection } from "@/components/surface-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
  listMembers,
} from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { listCategories } from "@/features/categories/services";
import { listPaymentAccountsForUser } from "@/features/transactions/services";
import { NewTransactionPageForm } from "@/features/transactions/components/new-transaction-page-form";

export const metadata = {
  title: "Nueva transacción · Finance Hub",
};

type AccountsResult = Awaited<ReturnType<typeof listAccounts>>;
type CategoriesResult = Awaited<ReturnType<typeof listCategories>>;
type MembersResult = Awaited<ReturnType<typeof listMembers>>;
type PaymentGroupsResult = Awaited<
  ReturnType<typeof listPaymentAccountsForUser>
>;
type FormData = [
  AccountsResult,
  CategoriesResult,
  MembersResult | [],
  PaymentGroupsResult,
];

export default async function NewTransactionPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await getActiveWorkspaceForUser(session.user.id);
  if (!workspace) {
    redirect("/transactions");
  }

  if (workspace.role === "viewer") {
    redirect("/transactions");
  }

  const dataPromise: Promise<FormData> = Promise.all([
    listAccounts({ userId: session.user.id, workspaceId: workspace.id }),
    listCategories({ userId: session.user.id, workspaceId: workspace.id }),
    workspace.type === "group"
      ? listMembers(session.user.id, workspace.id)
      : Promise.resolve([]),
    listPaymentAccountsForUser(session.user.id),
  ]);

  return (
    <ContentPanel
      title="Nueva transacción"
      description={`Gasto, ingreso o transferencia en ${workspace.baseCurrency}.`}
      actions={
        <Button asChild variant="outline">
          <Link href="/transactions">Volver</Link>
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-lg">
        <SurfaceSection>
          <Suspense fallback={<NewTransactionFormSkeleton />}>
            <NewTransactionFormSection
              workspace={workspace}
              currentUserId={session.user.id}
              data={dataPromise}
            />
          </Suspense>
        </SurfaceSection>
      </div>
    </ContentPanel>
  );
}

type ActiveWorkspace = NonNullable<
  Awaited<ReturnType<typeof getActiveWorkspaceForUser>>
>;

async function NewTransactionFormSection({
  workspace,
  currentUserId,
  data,
}: {
  workspace: ActiveWorkspace;
  currentUserId: string;
  data: Promise<FormData>;
}) {
  const [accounts, categories, members, paymentGroups] = await data;

  const activeAccounts = accounts.filter((a) => !a.isArchived);
  if (activeAccounts.length === 0) {
    redirect("/accounts");
  }

  const groupMembers =
    workspace.type === "group"
      ? members.map((m) => ({
          userId: m.userId,
          displayName:
            m.user.displayName?.trim() || m.user.name || m.user.email,
        }))
      : [];

  return (
    <NewTransactionPageForm
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
      currentUserId={currentUserId}
    />
  );
}

function NewTransactionFormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Cargando formulario">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}
