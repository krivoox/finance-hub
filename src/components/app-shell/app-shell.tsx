"use client";

import { usePathname } from "next/navigation";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { CafecitoDonationDialog } from "@/features/cafecito/components/cafecito-donation-dialog";
import { NewTransactionSheet } from "@/features/transactions/components/new-transaction-sheet";

import { AppSidebar, type AppSidebarProps } from "./app-sidebar";
import { MobileTabBar } from "./mobile-tab-bar";
import { getPageTitle } from "./nav-config";

type AppShellProps = AppSidebarProps & {
  children: React.ReactNode;
  /** Cafecito profile URL; null disables the donation soft-ask. */
  cafecitoUrl?: string | null;
};

/** Space reserved for the floating mobile tab bar + safe area. */
const MOBILE_TAB_BAR_CLEARANCE =
  "pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-3";

export function AppShell({
  children,
  user,
  workspaces,
  activeWorkspace,
  navBadges,
  usdQuotes,
  cafecitoUrl = null,
}: AppShellProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const canMutate = activeWorkspace?.role !== "viewer";

  return (
    <SidebarProvider className="min-h-svh md:h-svh md:overflow-hidden">
      <AppSidebar
        user={user}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        navBadges={navBadges}
        usdQuotes={usdQuotes}
        cafecitoUrl={cafecitoUrl}
      />
      {/*
        Mobile: document/body scrolls (no nested overflow trap).
        md+: capped viewport + nested scroll inside ContentPanel.
      */}
      {/*
        Mobile: canvas = bg-card (same as edge-to-edge ContentPanel) so the
        tab-bar clearance / safe-area isn’t the near-black bg-background.
        md+: restore bg-background — charcoal canvas around the floating panel.
      */}
      <SidebarInset className="flex min-h-svh flex-col bg-card md:h-svh md:max-h-svh md:overflow-hidden md:bg-background">
        {/*
          Desktop only: trigger + page title.
          Mobile: tab bar is primary nav; ContentPanel owns the H1 — a sticky
          title bar would duplicate it. Safe-area lives on the content wrapper.
        */}
        <header className="hidden h-12 shrink-0 items-center gap-2 px-3 sm:px-4 md:flex">
          <SidebarTrigger className="-ml-1 size-9" />
          <p className="min-w-0 truncate text-sm font-medium text-foreground">
            {title}
          </p>
        </header>
        <div
          className={`flex flex-1 flex-col p-0 pt-[env(safe-area-inset-top)] md:min-h-0 md:overflow-hidden md:p-3 ${MOBILE_TAB_BAR_CLEARANCE}`}
        >
          {children}
        </div>
        <InstallPrompt />
        <CafecitoDonationDialog donationUrl={cafecitoUrl} />
      </SidebarInset>

      <MobileTabBar
        user={user}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        navBadges={navBadges}
        canRegister={Boolean(activeWorkspace) && canMutate}
        cafecitoUrl={cafecitoUrl}
      />

      <NewTransactionSheet
        enabled={Boolean(activeWorkspace) && canMutate}
        workspaceId={activeWorkspace?.id ?? null}
      />
    </SidebarProvider>
  );
}
