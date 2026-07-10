"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import {
  getActiveRailSection,
  isNavItemActive,
  railFooterItems,
  railSections,
} from "./nav-config";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = getActiveRailSection(pathname);

  return (
    <div className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Abrir menú">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(100%,20rem)] p-0">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle className="text-base">Finance Hub</SheetTitle>
          </SheetHeader>

          <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
            {railSections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === active.id;
              return (
                <Link
                  key={section.id}
                  href={section.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={1.75} />
                  {section.title}
                </Link>
              );
            })}
          </div>

          <nav className="space-y-4 p-3">
            {active.groups.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const itemActive = isNavItemActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm",
                        itemActive
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {Icon ? (
                        <Icon className="size-4 opacity-80" strokeWidth={1.75} />
                      ) : null}
                      <span className="flex-1">{item.title}</span>
                      {item.badge != null && item.badge > 0 ? (
                        <Badge variant="secondary">{item.badge}</Badge>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="border-t border-border pt-3">
              {railFooterItems.map((item) => {
                const Icon = item.icon!;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    <Icon className="size-4 opacity-80" strokeWidth={1.75} />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {active.navTitle}
        </p>
      </div>
    </div>
  );
}
