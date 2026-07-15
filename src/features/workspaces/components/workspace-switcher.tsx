"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Home, Users } from "lucide-react";

import { setActiveWorkspaceAction } from "@/features/workspaces/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type WorkspaceOption = {
  id: string;
  name: string;
  type: "personal" | "group";
  baseCurrency: string;
  /** Present on the active workspace; used to gate mutate CTAs. */
  role?: "owner" | "admin" | "member" | "viewer";
};

export type WorkspaceSwitcherProps = {
  active: WorkspaceOption | null;
  workspaces: readonly WorkspaceOption[];
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
  return letters.length > 0 ? letters : "FH";
}

export function WorkspaceSwitcher({
  active,
  workspaces,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeName = active?.name ?? "Sin workspace";
  const activeInitials = active ? initialsFromName(active.name) : "FH";
  const activeSubtitle = active
    ? active.type === "personal"
      ? "Personal"
      : `Grupal · ${active.baseCurrency}`
    : "Finance Hub";

  const handleSelect = (workspaceId: string) => {
    if (!workspaceId || workspaceId === active?.id) return;
    startTransition(async () => {
      const result = await setActiveWorkspaceAction({ workspaceId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={workspaces.length === 0}>
            <SidebarMenuButton
              size="lg"
              className="data-active:bg-transparent"
              tooltip={activeName}
              disabled={isPending}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                {activeInitials}
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold text-sidebar-accent-foreground">
                  {activeName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeSubtitle}
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
            <DropdownMenuLabel>Tus workspaces</DropdownMenuLabel>
            {workspaces.map((ws) => {
              const Icon = ws.type === "personal" ? Home : Users;
              const isActive = ws.id === active?.id;
              return (
                <DropdownMenuItem
                  key={ws.id}
                  onSelect={() => handleSelect(ws.id)}
                  className="gap-2"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{ws.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {ws.type === "personal" ? "Personal" : "Grupal"} ·{" "}
                      {ws.baseCurrency}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "size-4 text-foreground",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => router.push("/settings#nuevo-workspace")}
              className="text-muted-foreground"
            >
              + Nuevo workspace grupal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
