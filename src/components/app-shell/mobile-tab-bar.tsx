"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { useNewTransactionSheetStore } from "@/features/transactions/stores/new-transaction-sheet-store";
import { cn } from "@/lib/utils";
import type { WorkspaceOption } from "@/features/workspaces/components/workspace-switcher";

import type { SidebarUser } from "./app-sidebar";
import { MobileMoreSheet } from "./mobile-more-sheet";
import {
  budgetNavBadgePresentation,
  isNavItemActive,
  mobileTabItems,
  type NavBadges,
} from "./nav-config";

type MobileTabBarProps = {
  user: SidebarUser;
  workspaces: readonly WorkspaceOption[];
  activeWorkspace: WorkspaceOption | null;
  navBadges?: NavBadges;
  canRegister: boolean;
  cafecitoUrl?: string | null;
};

/**
 * Floating mobile tab bar — primary destinations + center Registrar CTA.
 * Desktop keeps the sidebar; this is `md:hidden` only.
 *
 * Layout: fixed 5-column grid so the center `+` never shifts when the active
 * tab shows its label. Active: soft pill + label inside its cell (truncated).
 */
export function MobileTabBar({
  user,
  workspaces,
  activeWorkspace,
  navBadges = {},
  canRegister,
  cafecitoUrl = null,
}: MobileTabBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const openNewTransaction = useNewTransactionSheetStore((s) => s.openSheet);
  const budgetsBadge = budgetNavBadgePresentation(navBadges);

  const moreActive =
    moreOpen ||
    [
      "/accounts",
      "/goals",
      "/groups",
      "/settings",
      "/transactions/recurring",
    ].some((href) => isNavItemActive(pathname, href));

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden"
      >
        {/*
          Solid canvas behind the floating pill + home-indicator. Matches
          ContentPanel (`bg-card`) so overscroll / body peek isn’t near-black.
        */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[calc(4.75rem+env(safe-area-inset-bottom))] bg-card"
        />
        <div
          className={cn(
            "pointer-events-auto relative mx-auto w-[min(100%-1.5rem,28rem)]",
            "mb-[max(0.5rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div
            className={cn(
              "grid grid-cols-5 items-end gap-0.5 rounded-full border border-border bg-card/95 px-1.5 py-1.5 shadow-md backdrop-blur-md",
              "dark:border-transparent dark:bg-secondary/95 dark:shadow-[0_8px_28px_oklch(0_0_0/0.4)]",
            )}
          >
            {mobileTabItems.map((item) => {
              if (item.kind === "action") {
                return (
                  <div
                    key={item.id}
                    className="flex h-11 items-end justify-center"
                  >
                    {canRegister ? (
                      <button
                        type="button"
                        onClick={() => openNewTransaction()}
                        aria-label={item.title}
                        className={cn(
                          "flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm",
                          "transition-transform duration-200 ease-out active:scale-95",
                          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          "motion-reduce:transition-none motion-reduce:active:scale-100",
                        )}
                      >
                        <item.icon className="size-5" strokeWidth={2} />
                      </button>
                    ) : (
                      <span className="size-11" aria-hidden />
                    )}
                  </div>
                );
              }

              if (item.kind === "more") {
                return (
                  <TabSlot
                    key={item.id}
                    active={moreActive}
                    label={item.title}
                    onClick={() => setMoreOpen(true)}
                    icon={<item.icon className="size-5" strokeWidth={1.75} />}
                  />
                );
              }

              const active =
                item.id === "transactions"
                  ? isNavItemActive(pathname, item.href) &&
                    !pathname.startsWith("/transactions/recurring")
                  : isNavItemActive(pathname, item.href);
              const showBudgetsBadge =
                item.id === "budgets" && budgetsBadge != null;

              return (
                <TabSlot
                  key={item.id}
                  active={active}
                  label={item.title}
                  href={item.href}
                  badge={
                    showBudgetsBadge ? (
                      <span
                        className={cn(
                          "absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-card text-[9px] font-medium tabular-nums ring-1 ring-border",
                          budgetsBadge.severity === "critical" &&
                            "text-expense",
                          budgetsBadge.severity === "caution" &&
                            "text-warning",
                        )}
                        aria-label={budgetsBadge.ariaLabel}
                      >
                        {budgetsBadge.severity === "critical" ? (
                          <AlertTriangle className="size-2.5" aria-hidden />
                        ) : (
                          budgetsBadge.count
                        )}
                      </span>
                    ) : null
                  }
                  icon={<item.icon className="size-5" strokeWidth={1.75} />}
                />
              );
            })}
          </div>
        </div>
      </nav>

      <MobileMoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        user={user}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        navBadges={navBadges}
        cafecitoUrl={cafecitoUrl}
      />
    </>
  );
}

type TabSlotProps = {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
};

function TabSlot({ active, label, icon, href, onClick, badge }: TabSlotProps) {
  const className = cn(
    "relative flex h-11 w-full min-w-0 items-center justify-center gap-1 overflow-hidden rounded-full px-1",
    "text-[10px] font-medium leading-none transition-[background-color,color] duration-200 ease-out",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    "motion-reduce:transition-none",
    active
      ? "bg-secondary text-foreground dark:bg-muted"
      : "text-muted-foreground hover:text-foreground",
  );

  const body = (
    <>
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        {icon}
        {badge}
      </span>
      {active ? (
        <span className="min-w-0 truncate text-foreground">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={className}
      >
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}
