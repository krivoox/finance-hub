"use client";

import { usePathname } from "next/navigation";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

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
}: AppShellProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
      />
      <SidebarInset className="min-h-svh overflow-hidden md:max-h-svh">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <p className="truncate text-sm font-medium text-foreground">
            {title}
          </p>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-0 md:p-3">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
