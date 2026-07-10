"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  getActiveRailSection,
  railFooterItems,
  railSections,
} from "./nav-config";

// TODO: replace with authenticated user profile
const mockUser = {
  name: "Ana",
  initials: "AN",
};

export function IconRail() {
  const pathname = usePathname();
  const active = getActiveRailSection(pathname);

  return (
    <aside
      aria-label="Navegación principal"
      className="hidden h-full w-14 shrink-0 flex-col items-center bg-sidebar-rail py-3 md:flex"
    >
      <Link
        href="/dashboard"
        className="mb-4 flex size-9 items-center justify-center rounded-lg bg-sidebar-rail-accent text-sm font-semibold tracking-tight text-sidebar-rail"
        aria-label="Finance Hub"
      >
        fh
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {railSections.map((section) => {
          const Icon = section.icon;
          const isActive = section.id === active.id;

          return (
            <Tooltip key={section.id}>
              <TooltipTrigger asChild>
                <Link
                  href={section.href}
                  aria-label={section.title}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full transition-colors",
                    isActive
                      ? "bg-sidebar-rail-accent text-sidebar-rail"
                      : "text-sidebar-rail-foreground hover:bg-sidebar-rail-accent/15 hover:text-sidebar-rail-accent"
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {section.title}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2">
        {railFooterItems.map((item) => {
          const Icon = item.icon!;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  aria-label={item.title}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full transition-colors",
                    isActive
                      ? "bg-sidebar-rail-accent text-sidebar-rail"
                      : "text-sidebar-rail-foreground hover:bg-sidebar-rail-accent/15 hover:text-sidebar-rail-accent"
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.title}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <Avatar size="sm" className="mt-1 size-8">
          <AvatarFallback className="bg-sidebar-rail-accent/20 text-[10px] text-sidebar-rail-accent">
            {mockUser.initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </aside>
  );
}
