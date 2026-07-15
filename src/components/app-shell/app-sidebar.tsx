"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from "@/features/workspaces/components/workspace-switcher";

import {
  applyNavBadges,
  footerNavItems,
  isNavItemActive,
  mainNavItems,
  navGroups,
  type NavBadges,
  type NavItem,
} from "./nav-config";

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
};

function NavMenuItems({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isNavItemActive(pathname, item.href);

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
              <Link href={item.href}>
                <Icon strokeWidth={1.75} />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
            {item.badge != null && item.badge > 0 ? (
              <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
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
}: AppSidebarProps) {
  const mainItems = applyNavBadges(mainNavItems, navBadges);
  const groups = navGroups.map((group) => ({
    ...group,
    items: applyNavBadges(group.items, navBadges),
  }));
  const footerItems = applyNavBadges(footerNavItems, navBadges);
  const canMutate = activeWorkspace?.role !== "viewer";

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-3">
        <WorkspaceSwitcher
          active={activeWorkspace}
          workspaces={workspaces}
        />

        <div className="flex items-center gap-2 px-0.5 group-data-[collapsible=icon]:flex-col">
          {canMutate ? (
            <Button
              asChild
              className="h-10 flex-1 justify-center gap-2 rounded-full px-3 text-center align-middle md:h-8 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:p-0"
            >
              <Link href="/transactions">
                <Plus className="size-4" strokeWidth={1.75} />
                <span className="flex flex-wrap group-data-[collapsible=icon]:sr-only">
                  Registrar
                </span>
              </Link>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-lg md:size-8"
            aria-label="Buscar"
            asChild
          >
            <Link href="/transactions">
              <Search className="size-4" strokeWidth={1.75} />
            </Link>
          </Button>
        </div>
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

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <NavMenuItems items={footerItems} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={user.displayName}>
              <Avatar size="sm" className="size-8">
                <AvatarFallback className="bg-muted text-xs">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.displayName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
