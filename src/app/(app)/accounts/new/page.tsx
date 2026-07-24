import { redirect } from "next/navigation";
import Link from "next/link";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { NewAccountPageForm } from "@/features/accounts/components/new-account-page-form";

export const metadata = {
  title: "Nueva cuenta · Finance Hub",
};

export default async function NewAccountPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await getActiveWorkspaceForUser(session.user.id);
  if (!workspace) {
    redirect("/accounts");
  }

  if (workspace.role === "viewer") {
    redirect("/accounts");
  }

  return (
    <ContentPanel
      title="Nueva cuenta"
      description={`Alta en ${workspace.name}. Default de moneda: ${workspace.baseCurrency}.`}
      actions={
        <Button asChild variant="outline" className="h-10 sm:h-8">
          <Link href="/accounts">Volver</Link>
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-lg">
        <NewAccountPageForm
          workspaceId={workspace.id}
          workspaceCurrency={workspace.baseCurrency}
        />
      </div>
    </ContentPanel>
  );
}
