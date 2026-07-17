"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronsUpDown, LogOut, Plus, Search } from "lucide-react";
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from "@/features/workspaces/components/workspace-switcher";

import { ThemeToggle } from "@/components/theme-toggle";

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

function SidebarUserMenu({ user }: { user: SidebarUser }) {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    if (isMobile) {
      setOpenMobile(false);
    }

    startTransition(async () => {
      const { error } = await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login");
            router.refresh();
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
                <AvatarFallback className="bg-muted text-xs">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{user.displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
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
              <Link href="/transactions?new=1">
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
            <ThemeToggle />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarUserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
