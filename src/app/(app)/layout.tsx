import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { getNavBadges } from "@/components/app-shell/get-nav-badges";
import type { NavBadges } from "@/components/app-shell/nav-config";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import {
  getActiveWorkspaceForUser,
  listMyWorkspaces,
} from "@/features/workspaces/services";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
  return letters.length > 0 ? letters : "FH";
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const activeWorkspacePromise = getActiveWorkspaceForUser(session.user.id);
  const navBadgesPromise = activeWorkspacePromise.then((workspace) =>
    workspace
      ? getNavBadges({
          userId: session.user.id,
          workspaceId: workspace.id,
        })
      : Promise.resolve({} as NavBadges),
  );

  const [user, workspaces, activeWorkspace, navBadges] = await Promise.all([
    getCurrentUser(),
    listMyWorkspaces(session.user.id),
    activeWorkspacePromise,
    navBadgesPromise,
  ]);

  if (!user) {
    redirect("/login");
  }

  const displayName = user.displayName ?? user.name;

  return (
    <AppShell
      user={{
        displayName,
        email: user.email,
        initials: initialsFromName(displayName),
      }}
      workspaces={workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        baseCurrency: w.baseCurrency,
      }))}
      activeWorkspace={
        activeWorkspace
          ? {
              id: activeWorkspace.id,
              name: activeWorkspace.name,
              type: activeWorkspace.type,
              baseCurrency: activeWorkspace.baseCurrency,
              role: activeWorkspace.role,
            }
          : null
      }
      navBadges={navBadges}
    >
      {children}
    </AppShell>
  );
}
