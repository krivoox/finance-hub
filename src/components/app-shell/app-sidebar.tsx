"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangle, ChevronsUpDown, Coffee, LogOut, Plus } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { navigateAndRefresh } from "@/lib/navigation";
import { useCafecitoDialogStore } from "@/features/cafecito/stores/cafecito-dialog-store";
import { useNewTransactionSheetStore } from "@/features/transactions/stores/new-transaction-sheet-store";
import { formOptionsIntentPrefetchHandlers } from "@/features/transactions/stores/new-transaction-form-options-store";
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from "@/features/workspaces/components/workspace-switcher";

import { ThemeToggle } from "@/components/theme-toggle";
import { UsdQuotesCard } from "@/features/fx-quotes/components/usd-quotes-card";
import type { UsdQuotesDto } from "@/features/fx-quotes/types";

import {
  applyNavBadges,
  footerNavItems,
  isNavItemActive,
  mainNavItems,
  navGroups,
  type NavBadges,
  type NavItem,
} from "./nav-config";
import { NavGlyph } from "./nav-glyph";
import { navIntentPrefetchHandlers } from "./use-nav-prefetch";

export type SidebarUser = {
  displayName: string;
  email: string;
  initials: string;
};

export type AppSidebarProps = {
  user: SidebarUser;
  workspaces: readonly WorkspaceOption[];
  activeWorkspace: WorkspaceOption | null;
  navBadges?: NavBadges;
  usdQuotes?: UsdQuotesDto | null;
  cafecitoUrl?: string | null;
};

function SidebarUserMenu({
  user,
  cafecitoUrl,
}: {
  user: SidebarUser;
  cafecitoUrl: string | null;
}) {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();
  const openCafecito = useCafecitoDialogStore((s) => s.openDialog);

  const handleSignOut = () => {
    if (isMobile) {
      setOpenMobile(false);
    }

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
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isPending}>
            <SidebarMenuButton
              size="lg"
              tooltip={user.displayName}
              disabled={isPending}
            >
              <Avatar size="sm" className="size-8">
                <AvatarFallback className="bg-sidebar-primary text-xs text-sidebar-primary-foreground">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium text-sidebar-primary-foreground">
                  {user.displayName}
                </span>
                <span className="truncate text-xs text-sidebar-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-56"
            sideOffset={6}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="truncate font-medium">{user.displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            {cafecitoUrl ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => {
                    if (isMobile) setOpenMobile(false);
                    openCafecito({ forced: true });
                  }}
                >
                  <Coffee className="size-4" strokeWidth={1.75} />
                  Invitame un cafecito
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={handleSignOut}
              className="gap-2"
            >
              <LogOut className="size-4" />
              {isPending ? "Cerrando sesión..." : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function NavMenuItems({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();

  const handleNavigate = () => {
    if (isMobile) setOpenMobile(false);
    startTransition(() => {});
  };

  return (
    <SidebarMenu className={isPending ? "opacity-70 transition-opacity" : undefined}>
      {items.map((item) => {
        const children = item.children ?? [];
        const childActive = children.some((child) =>
          isNavItemActive(pathname, child.href),
        );
        const active = isNavItemActive(pathname, item.href) && !childActive;

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
              <Link
                href={item.href}
                onClick={handleNavigate}
                {...navIntentPrefetchHandlers(router, item.href)}
              >
                <NavGlyph>{item.glyph}</NavGlyph>
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
            {item.badge != null && item.badge > 0 ? (
              <SidebarMenuBadge
                aria-label={item.badgeAriaLabel}
                className={cn(
                  "gap-1",
                  item.badgeSeverity === "critical" && "text-expense",
                  item.badgeSeverity === "caution" && "text-warning",
                )}
              >
                {item.badgeSeverity === "critical" ? (
                  <AlertTriangle className="size-3 shrink-0" aria-hidden />
                ) : null}
                <span>{item.badge}</span>
              </SidebarMenuBadge>
            ) : null}
            {children.length > 0 ? (
              <SidebarMenuSub>
                {children.map((child) => {
                  return (
                    <SidebarMenuSubItem key={child.href}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={isNavItemActive(pathname, child.href)}
                      >
                        <Link
                          href={child.href}
                          onClick={handleNavigate}
                          {...navIntentPrefetchHandlers(router, child.href)}
                        >
                          <NavGlyph>{child.glyph}</NavGlyph>
                          <span>{child.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            ) : null}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar({
  user,
  workspaces,
  activeWorkspace,
  navBadges = {},
  usdQuotes = null,
  cafecitoUrl = null,
}: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const openNewTransaction = useNewTransactionSheetStore((s) => s.openSheet);
  const mainItems = applyNavBadges(mainNavItems, navBadges);
  const groups = navGroups.map((group) => ({
    ...group,
    items: applyNavBadges(group.items, navBadges),
  }));
  const footerItems = applyNavBadges(footerNavItems, navBadges);
  const canMutate = activeWorkspace?.role !== "viewer";

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-3">
        <WorkspaceSwitcher
          userName={user.displayName}
          userInitials={user.initials}
        />

        {canMutate ? (
          <div className="px-0.5">
            <Button
              type="button"
              className="h-10 w-full justify-center gap-2 rounded-xl px-3 text-sm font-bold group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:p-0"
              onClick={() => {
                if (isMobile) setOpenMobile(false);
                openNewTransaction();
              }}
              {...formOptionsIntentPrefetchHandlers()}
            >
              <Plus className="size-4" strokeWidth={1.75} />
              <span className="flex flex-wrap group-data-[collapsible=icon]:sr-only">
                Registrar
              </span>
            </Button>
          </div>
        ) : null}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavMenuItems items={mainItems} />
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavMenuItems items={group.items} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-2.5 pb-3 md:gap-2 md:pb-2">
        {usdQuotes ? (
          <UsdQuotesCard
            quotes={usdQuotes}
            workspaceId={activeWorkspace?.id ?? null}
            canMutate={canMutate}
          />
        ) : null}
        <SidebarSeparator />
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <NavMenuItems items={footerItems} />
            <ThemeToggle />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarUserMenu user={user} cafecitoUrl={cafecitoUrl} />
      </SidebarFooter>
    </Sidebar>
  );
}
