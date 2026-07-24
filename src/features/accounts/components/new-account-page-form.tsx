"use client";

import { useRouter } from "next/navigation";

import { NewAccountForm } from "@/features/accounts/components/new-account-form";

export function NewAccountPageForm({
  workspaceId,
  workspaceCurrency,
}: {
  workspaceId: string;
  workspaceCurrency: string;
}) {
  const router = useRouter();

  return (
    <NewAccountForm
      workspaceId={workspaceId}
      workspaceCurrency={workspaceCurrency}
      onSuccess={() => {
        router.push("/accounts");
        router.refresh();
      }}
      onCancel={() => {
        router.push("/accounts");
      }}
    />
  );
}
