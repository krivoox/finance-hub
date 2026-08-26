"use client";

import { useRouter } from "next/navigation";

import { NewTransactionForm } from "@/features/transactions/components/new-transaction-form";
import type { ExpenseSplitGroupOption } from "@/features/splits/components/expense-split-fields";
import { navigateAndRefresh } from "@/lib/navigation";

type AccountOption = {
  id: string;
  name: string;
  currency: string;
};

type CategoryOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
};

export function NewTransactionPageForm({
  workspaceId,
  workspaceName,
  workspaceCurrency,
  accounts,
  categories,
  splitGroups,
  currentUserId,
}: {
  workspaceId: string;
  workspaceName: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
  splitGroups: readonly ExpenseSplitGroupOption[];
  currentUserId: string;
}) {
  const router = useRouter();

  return (
    <NewTransactionForm
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      workspaceCurrency={workspaceCurrency}
      accounts={accounts}
      categories={categories}
      splitGroups={splitGroups}
      currentUserId={currentUserId}
      onSuccess={() => {
        navigateAndRefresh(router, "/transactions");
      }}
      onCancel={() => {
        router.push("/transactions");
      }}
    />
  );
}
