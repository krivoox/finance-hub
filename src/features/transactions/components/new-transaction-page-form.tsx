"use client";

import { useRouter } from "next/navigation";

import type { AccountType } from "@/features/accounts/domain";
import { NewTransactionForm } from "@/features/transactions/components/new-transaction-form";
import type { ExpenseSplitGroupOption } from "@/features/splits/components/expense-split-fields";
import { navigateAndRefresh } from "@/lib/navigation";

type AccountOption = {
  id: string;
  name: string;
  currency: string;
  type: AccountType;
  currentBalanceCents: number;
};

type CategoryOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
  usageCount?: number;
};

export function NewTransactionPageForm({
  workspaceId,
  workspaceCurrency,
  accounts,
  categories,
  splitGroups,
  currentUserId,
}: {
  workspaceId: string;
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
