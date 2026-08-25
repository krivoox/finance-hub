"use client";

import { Home } from "lucide-react";

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
  active: WorkspaceOption | null;
  workspaces?: readonly WorkspaceOption[];
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
 * KRI-29: product is personal-only. The control is a label, not a switcher.
 */
export function WorkspaceSwitcher({ active }: WorkspaceSwitcherProps) {
  const activeName = active?.name ?? "Personal";
  const activeInitials = active ? initialsFromName(active.name) : "FH";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="pointer-events-none cursor-default"
          aria-label={activeName}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            {activeInitials}
          </div>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{activeName}</span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              Personal
            </span>
          </div>
          <Home className="size-4 opacity-50" aria-hidden />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
