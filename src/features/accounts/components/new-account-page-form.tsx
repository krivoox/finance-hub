"use client";

import { useRouter } from "next/navigation";

import { NewAccountForm } from "@/features/accounts/components/new-account-form";
import { navigateAndRefresh } from "@/lib/navigation";

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
        navigateAndRefresh(router, "/accounts");
      }}
      onCancel={() => {
        router.push("/accounts");
      }}
    />
  );
}
