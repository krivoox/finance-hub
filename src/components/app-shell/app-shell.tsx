"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { CafecitoDonationDialog } from "@/features/cafecito/components/cafecito-donation-dialog";
import { NewTransactionSheet } from "@/features/transactions/components/new-transaction-sheet";

import { AppSidebar, type AppSidebarProps } from "./app-sidebar";
import { MobileTabBar } from "./mobile-tab-bar";
import { SkipLink } from "./skip-link";
import { useNavPrefetch } from "./use-nav-prefetch";

type AppShellProps = AppSidebarProps & {
  children: React.ReactNode;
  /** Cafecito profile URL; null disables the donation soft-ask. */
  cafecitoUrl?: string | null;
};

/** Space reserved for the docked mobile tab bar + safe area. */
const MOBILE_TAB_BAR_CLEARANCE =
  "pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0";

export function AppShell({
  children,
  user,
  workspaces,
  activeWorkspace,
  navBadges,
  usdQuotes,
  cafecitoUrl = null,
}: AppShellProps) {
  const canMutate = activeWorkspace?.role !== "viewer";

  useNavPrefetch(Boolean(activeWorkspace));

  return (
    <>
      <SkipLink />
      <SidebarProvider className="min-h-svh max-w-full overflow-x-hidden md:h-svh md:overflow-hidden">
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
          Canvas is always `bg-background` (slate paper / navy night).
          Tab bar lives *outside* this flex row so it cannot widen the page
          or become a third column (that hid the dock and caused lateral scroll).
        */}
        <SidebarInset
          id="main-content"
          tabIndex={-1}
          className="flex min-h-svh min-w-0 max-w-full flex-col bg-background outline-none md:h-svh md:max-h-svh md:overflow-hidden"
        >
          <OfflineBanner />
          {/*
            Desktop: collapse trigger only — page title lives in ContentPanel.
            Mobile: tab bar is primary nav; ContentPanel owns the H1.
          */}
          <header className="hidden h-11 shrink-0 items-center gap-2 px-3 md:flex">
            <SidebarTrigger className="-ml-1 size-9" />
          </header>
          <div
            className={`flex min-w-0 flex-1 flex-col overflow-x-hidden p-0 pt-[env(safe-area-inset-top)] md:min-h-0 md:overflow-hidden ${MOBILE_TAB_BAR_CLEARANCE}`}
          >
            {children}
          </div>
          <InstallPrompt />
          <CafecitoDonationDialog donationUrl={cafecitoUrl} />
        </SidebarInset>
      </SidebarProvider>

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
    </>
  );
}
