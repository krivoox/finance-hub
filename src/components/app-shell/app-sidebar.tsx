"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, Plus, Search } from "lucide-react";

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
  footerNavItems,
  isNavItemActive,
  mainNavItems,
  mockWorkspace,
  navGroups,
  type NavItem,
} from "./nav-config";

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

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-active:bg-transparent"
              tooltip={mockWorkspace.name}
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                {mockWorkspace.initials}
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-sidebar-accent-foreground">
                  {mockWorkspace.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Finance Hub
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex items-center gap-2 px-0.5 group-data-[collapsible=icon]:flex-col">
          <Button
            asChild
            className="h-8 flex-1 justify-start gap-2 rounded-full px-3 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:p-0"
          >
            <Link href="/transactions">
              <Plus className="size-4" strokeWidth={1.75} />
              <span className="group-data-[collapsible=icon]:sr-only">
                Registrar
              </span>
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 shrink-0 rounded-lg"
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
            <NavMenuItems items={mainNavItems} />
          </SidebarGroupContent>
        </SidebarGroup>

        {navGroups.map((group) => (
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
            <NavMenuItems items={footerNavItems} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarMenu>
          <SidebarMenuItem>
            {/* TODO: replace with authenticated user */}
            <SidebarMenuButton size="lg" tooltip="Ana">
              <Avatar size="sm" className="size-8">
                <AvatarFallback className="bg-muted text-xs">AN</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Ana</span>
                <span className="truncate text-xs text-muted-foreground">
                  ana@example.com
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
