"use client";

import { usePathname } from "next/navigation";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { InstallPrompt } from "@/components/pwa/install-prompt";

import { AppSidebar, type AppSidebarProps } from "./app-sidebar";
import { getPageTitle } from "./nav-config";

type AppShellProps = AppSidebarProps & {
  children: React.ReactNode;
};

export function AppShell({
  children,
  user,
  workspaces,
  activeWorkspace,
  navBadges,
}: AppShellProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <SidebarProvider className="min-h-svh md:h-svh md:overflow-hidden">
      <AppSidebar
        user={user}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        navBadges={navBadges}
      />
      {/*
        Mobile: document/body scrolls (no nested overflow trap).
        md+: capped viewport + nested scroll inside ContentPanel.
      */}
      <SidebarInset className="flex min-h-svh flex-col md:h-svh md:max-h-svh md:overflow-hidden">
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 pt-[env(safe-area-inset-top)] sm:px-4 md:static">
          <SidebarTrigger className="-ml-1 size-9" />
          <p className="min-w-0 truncate text-sm font-medium text-foreground">
            {title}
          </p>
        </header>
        <div className="flex flex-1 flex-col p-0 pb-[env(safe-area-inset-bottom)] md:min-h-0 md:overflow-hidden md:p-3 md:pb-3">
          {children}
        </div>
        <InstallPrompt />
      </SidebarInset>
    </SidebarProvider>
  );
}
