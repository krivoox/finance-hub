"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { useNewTransactionSheetStore } from "@/features/transactions/stores/new-transaction-sheet-store";
import { cn } from "@/lib/utils";

import type { SidebarUser } from "./app-sidebar";
import { MobileMoreSheet } from "./mobile-more-sheet";
import {
  budgetNavBadgePresentation,
  isNavItemActive,
  mobileTabItems,
  type NavBadges,
} from "./nav-config";
import { NavGlyph } from "./nav-glyph";
import { navIntentPrefetchHandlers } from "./use-nav-prefetch";

type MobileTabBarProps = {
  user: SidebarUser;
  navBadges?: NavBadges;
  canRegister: boolean;
  cafecitoUrl?: string | null;
};

/**
 * Docked mobile tab bar — primary destinations + center Registrar CTA.
 * Desktop keeps the navy sidebar; this is `md:hidden` only.
 */
export function MobileTabBar({
  user,
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
        className="fixed bottom-0 left-0 z-50 w-full max-w-full overflow-x-hidden border-t border-border bg-card/95 backdrop-blur-sm md:hidden"
      >
        <div
          className="grid grid-cols-5 items-end gap-0.5 px-1.5 pt-1.5"
          style={{
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
          }}
        >
          {mobileTabItems.map((item) => {
            if (item.kind === "action") {
              return (
                <div key={item.id} className="flex h-12 items-center justify-center">
                  {canRegister ? (
                    <button
                      type="button"
                      onClick={() => openNewTransaction()}
                      aria-label={item.title}
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl bg-cta text-primary-foreground shadow-card",
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
                        budgetsBadge.severity === "critical" && "text-expense",
                        budgetsBadge.severity === "caution" && "text-warning",
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
                icon={<NavGlyph>{item.glyph}</NavGlyph>}
              />
            );
          })}
        </div>
      </nav>

      <MobileMoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        user={user}
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
  const router = useRouter();
  const className = cn(
    "relative flex h-12 w-full min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl px-0.5",
    "text-[9px] font-medium leading-tight transition-[background-color,color] duration-200 ease-out",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    "motion-reduce:transition-none",
    active
      ? "bg-info-muted text-info-muted-foreground"
      : "text-muted-foreground hover:text-foreground",
  );

  const body = (
    <>
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        {icon}
        {badge}
      </span>
      <span className="min-w-0 max-w-full truncate text-center">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={className}
        {...navIntentPrefetchHandlers(router, href)}
      >
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {body}
    </button>
  );
}
