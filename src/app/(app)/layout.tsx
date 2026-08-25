import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell/app-shell";
import { getNavBadges } from "@/components/app-shell/get-nav-badges";
import type { NavBadges } from "@/components/app-shell/nav-config";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import {
  getActiveWorkspaceForUser,
  getWorkspaceSetupStatus,
  listMyWorkspaces,
} from "@/features/workspaces/services";
import { getUsdQuotes } from "@/features/fx-quotes/services";
import { env } from "@/lib/env";

/** Routes that live outside this layout but may still set x-pathname while app chrome loads. */
const SETUP_EXEMPT_PREFIXES = ["/invitaciones"];

function isSetupExempt(pathname: string): boolean {
  return SETUP_EXEMPT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

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
  const setupStatusPromise = activeWorkspacePromise.then((workspace) =>
    workspace
      ? getWorkspaceSetupStatus({
          userId: session.user.id,
          workspaceId: workspace.id,
        })
      : Promise.resolve(null),
  );

  const [
    user,
    workspaces,
    activeWorkspace,
    navBadges,
    headerList,
    usdQuotes,
    setup,
  ] = await Promise.all([
    getCurrentUser(),
    listMyWorkspaces(session.user.id),
    activeWorkspacePromise,
    navBadgesPromise,
    headers(),
    env.USD_QUOTES_ENABLED ? getUsdQuotes() : Promise.resolve(null),
    setupStatusPromise,
  ]);

  if (!user) {
    redirect("/login");
  }

  const pathname = headerList.get("x-pathname") ?? "";

  if (setup && !isSetupExempt(pathname) && setup.needsSetup) {
    redirect("/onboarding");
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
      usdQuotes={usdQuotes}
      cafecitoUrl={env.NEXT_PUBLIC_CAFECITO_URL}
    >
      {children}
    </AppShell>
  );
}
