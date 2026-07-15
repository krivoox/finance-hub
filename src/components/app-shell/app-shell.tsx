"use client";

import { usePathname } from "next/navigation";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
    <SidebarProvider>
      <AppSidebar
        user={user}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        navBadges={navBadges}
      />
      <SidebarInset className="min-h-svh overflow-hidden md:max-h-svh">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 pt-[env(safe-area-inset-top)] sm:px-4">
          <SidebarTrigger className="-ml-1 size-9" />
          <p className="min-w-0 truncate text-sm font-medium text-foreground">
            {title}
          </p>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-0 pb-[env(safe-area-inset-bottom)] md:p-3 md:pb-3">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
