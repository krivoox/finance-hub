import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import {
  countCategoryUsage,
  listCategories,
} from "@/features/categories/services";
import {
  NewTransactionScreen,
  type CoreAccountOption,
  type CoreCategoryOption,
} from "@/features/transactions/components/new-transaction-screen";
import {
  CORE_TYPE_ORDER,
  type CoreTransactionType,
} from "@/features/transactions/components/transaction-type-theme";

export const metadata = {
  title: "Registrar movimiento · Finance Hub",
};

const CORE_TYPES = new Set<string>(CORE_TYPE_ORDER);

function readInitialType(searchParams: {
  type?: string | string[];
  new?: string | string[];
}): CoreTransactionType {
  const candidate = searchParams.type ?? searchParams.new;
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  if (value && CORE_TYPES.has(value)) {
    return value as CoreTransactionType;
  }
  return "expense";
}

type AccountsResult = Awaited<ReturnType<typeof listAccounts>>;
type CategoriesResult = Awaited<ReturnType<typeof listCategories>>;
type UsageResult = Awaited<ReturnType<typeof countCategoryUsage>>;
type ScreenData = [AccountsResult, CategoriesResult, UsageResult];

export default async function NewMovementPage(props: {
  searchParams: Promise<{ type?: string | string[]; new?: string | string[] }>;
}) {
  const [session, searchParams] = await Promise.all([
    getSession(),
    props.searchParams,
  ]);
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

  const initialType = readInitialType(searchParams);
  const dataPromise: Promise<ScreenData> = Promise.all([
    listAccounts({ userId: session.user.id, workspaceId: workspace.id }),
    listCategories({ userId: session.user.id, workspaceId: workspace.id }),
    countCategoryUsage({ userId: session.user.id, workspaceId: workspace.id }),
  ]);

  return (
    <ContentPanel
      title="Registrar movimiento"
      description="Cargá el monto, elegí la cuenta y listo."
    >
      <Suspense fallback={<ScreenSkeleton />}>
        <ScreenSection
          workspaceId={workspace.id}
          workspaceCurrency={workspace.baseCurrency}
          initialType={initialType}
          data={dataPromise}
        />
      </Suspense>
    </ContentPanel>
  );
}

async function ScreenSection({
  workspaceId,
  workspaceCurrency,
  initialType,
  data,
}: {
  workspaceId: string;
  workspaceCurrency: string;
  initialType: CoreTransactionType;
  data: Promise<ScreenData>;
}) {
  const [accounts, categories, usageById] = await data;

  const activeAccounts: CoreAccountOption[] = accounts
    .filter((account) => !account.isArchived)
    .map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      type: account.type,
      currentBalanceCents: account.currentBalance.amountCents,
    }));

  if (activeAccounts.length === 0) {
    redirect("/accounts");
  }

  const activeCategories: CoreCategoryOption[] = categories
    .filter((category) => !category.isArchived)
    .map((category) => ({
      id: category.id,
      name: category.name,
      kind: category.kind,
      usageCount: usageById[category.id] ?? 0,
    }));

  return (
    <NewTransactionScreen
      workspaceId={workspaceId}
      workspaceCurrency={workspaceCurrency}
      accounts={activeAccounts}
      categories={activeCategories}
      initialType={initialType}
    />
  );
}

function ScreenSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col gap-5"
      aria-busy
      aria-label="Cargando formulario"
    >
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-10 w-2/3 rounded-lg" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
