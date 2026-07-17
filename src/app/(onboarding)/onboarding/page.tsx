import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import {
  getActiveWorkspaceForUser,
  getWorkspaceSetupStatus,
} from "@/features/workspaces/services";
import { listAccounts } from "@/features/accounts/services";
import { OnboardingWizard } from "@/features/workspaces/components/onboarding-wizard";
import type { AccountType } from "@/features/accounts/domain";

export const metadata = {
  title: "Configurar espacio · Finance Hub",
};

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await getActiveWorkspaceForUser(session.user.id);
  if (!workspace) {
    redirect("/dashboard");
  }

  const [setup, existingAccounts] = await Promise.all([
    getWorkspaceSetupStatus({
      userId: session.user.id,
      workspaceId: workspace.id,
    }),
    listAccounts({
      userId: session.user.id,
      workspaceId: workspace.id,
    }),
  ]);

  const canManage = setup.role === "owner" || setup.role === "admin";

  const initialAccounts = existingAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as AccountType,
    balanceCents: a.currentBalance.amountCents,
  }));

  return (
    <OnboardingWizard
      workspaceId={workspace.id}
      initialName={setup.workspaceName}
      initialCurrency={setup.baseCurrency}
      canManage={canManage}
      initialAccounts={initialAccounts}
    />
  );
}
