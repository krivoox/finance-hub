"use client";

import { useRouter } from "next/navigation";

import { NewTransactionForm } from "@/features/transactions/components/new-transaction-form";

type AccountOption = {
  id: string;
  name: string;
  currency: string;
  workspaceId?: string;
  workspaceName?: string;
  workspaceType?: "personal" | "group";
};

type PaymentAccountGroup = {
  workspaceId: string;
  workspaceName: string;
  workspaceType: "personal" | "group";
  accounts: readonly AccountOption[];
};

type CategoryOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
};

type MemberOption = {
  userId: string;
  displayName: string;
};

export function NewTransactionPageForm({
  workspaceId,
  workspaceName,
  workspaceCurrency,
  accounts,
  paymentAccountGroups,
  categories,
  groupMembers,
  currentUserId,
}: {
  workspaceId: string;
  workspaceName: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
  paymentAccountGroups: readonly PaymentAccountGroup[];
  categories: readonly CategoryOption[];
  groupMembers: readonly MemberOption[];
  currentUserId: string;
}) {
  const router = useRouter();

  return (
    <NewTransactionForm
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      workspaceCurrency={workspaceCurrency}
      accounts={accounts}
      paymentAccountGroups={paymentAccountGroups}
      categories={categories}
      groupMembers={groupMembers}
      currentUserId={currentUserId}
      onSuccess={() => {
        router.push("/transactions");
        router.refresh();
      }}
      onCancel={() => {
        router.push("/transactions");
      }}
    />
  );
}
