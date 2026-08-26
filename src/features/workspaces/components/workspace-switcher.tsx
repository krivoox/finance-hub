"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type WorkspaceOption = {
  id: string;
  name: string;
  type: "personal";
  baseCurrency: string;
  role?: "owner" | "admin" | "member" | "viewer";
};

export type WorkspaceSwitcherProps = {
  userName: string;
  userInitials: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
  return letters.length > 0 ? letters : "FH";
}

/**
 * KRI-29: no tenant switcher. The header is the signed-in account, not a workspace.
 */
export function WorkspaceSwitcher({
  userName,
  userInitials,
}: WorkspaceSwitcherProps) {
  const initials = userInitials || initialsFromName(userName);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="pointer-events-none cursor-default"
          aria-label={userName}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            {initials}
          </div>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{userName}</span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              Tu cuenta
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
