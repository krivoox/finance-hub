"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Coffee, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCafecitoDialogStore } from "@/features/cafecito/stores/cafecito-dialog-store";
import { signOut } from "@/lib/auth-client";
import { navigateAndRefresh } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from "@/features/workspaces/components/workspace-switcher";

import {
  applyNavBadges,
  isNavItemActive,
  mobileMoreNavItems,
  type NavBadges,
} from "./nav-config";
import type { SidebarUser } from "./app-sidebar";

type MobileMoreSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SidebarUser;
  workspaces: readonly WorkspaceOption[];
  activeWorkspace: WorkspaceOption | null;
  navBadges?: NavBadges;
  cafecitoUrl?: string | null;
};

/**
 * Overflow menu for mobile tab bar — routes outside the 4 primary tabs,
 * plus workspace, theme, and sign-out.
 */
export function MobileMoreSheet({
  open,
  onOpenChange,
  user,
  workspaces,
  activeWorkspace,
  navBadges = {},
  cafecitoUrl = null,
}: MobileMoreSheetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const items = applyNavBadges(mobileMoreNavItems, navBadges);
  const openCafecito = useCafecitoDialogStore((s) => s.openDialog);

  const close = () => onOpenChange(false);

  const handleSignOut = () => {
    close();
    startTransition(async () => {
      const { error } = await signOut({
        fetchOptions: {
          onSuccess: () => {
            navigateAndRefresh(router, "/login");
          },
        },
      });
      if (error) {
        toast.error("No se pudo cerrar sesión. Probá de nuevo.");
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="gap-0 rounded-t-2xl border-border pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-none"
      >
        <SheetHeader className="border-b border-border px-4 pb-3 text-left">
          <SheetTitle className="text-base font-semibold tracking-tight">
            Más
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pt-3">
          <WorkspaceSwitcher
            active={activeWorkspace}
            workspaces={workspaces}
          />

          <nav aria-label="Más destinos">
            <ul className="grid gap-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        active
                          ? "bg-secondary text-foreground"
                          : "text-foreground hover:bg-muted/60",
                      )}
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1 truncate">
                        {item.title}
                      </span>
                      {item.badge != null && item.badge > 0 ? (
                        <span
                          className={cn(
                            "tabular-nums text-xs",
                            item.badgeSeverity === "critical" &&
                              "text-expense",
                            item.badgeSeverity === "caution" && "text-warning",
                            !item.badgeSeverity && "text-muted-foreground",
                          )}
                          aria-label={item.badgeAriaLabel}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-border pt-3">
            <ThemeToggle />
          </div>

          {cafecitoUrl ? (
            <div className="border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-start gap-3 rounded-xl px-3 text-sm font-medium"
                onClick={() => {
                  close();
                  openCafecito({ forced: true });
                }}
              >
                <Coffee className="size-4 shrink-0" strokeWidth={1.75} />
                Invitame un cafecito
              </Button>
            </div>
          ) : null}

          <div className="flex items-center gap-3 border-t border-border pt-3">
            <Avatar size="sm" className="size-9">
              <AvatarFallback className="bg-muted text-xs">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user.displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-10 shrink-0 gap-1.5 rounded-full px-3"
              disabled={isPending}
              onClick={handleSignOut}
            >
              <LogOut className="size-4" strokeWidth={1.75} />
              <span className="sr-only sm:not-sr-only">
                {isPending ? "Saliendo…" : "Salir"}
              </span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
