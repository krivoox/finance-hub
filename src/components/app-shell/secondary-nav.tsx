"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  getActiveRailSection,
  isNavItemActive,
  type NavGroup,
} from "./nav-config";

function NavGroupBlock({ group, pathname }: { group: NavGroup; pathname: string }) {
  return (
    <div className="space-y-1">
      <p className="px-2.5 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {group.label}
      </p>
      <ul className="space-y-0.5">
        {group.items.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {Icon ? (
                  <Icon className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                {item.badge != null && item.badge > 0 ? (
                  <Badge
                    variant={active ? "info" : "secondary"}
                    className="h-5 min-w-5 justify-center px-1.5"
                  >
                    {item.badge}
                  </Badge>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SecondaryNav() {
  const pathname = usePathname();
  const section = getActiveRailSection(pathname);

  return (
    <aside
      aria-label={section.navTitle}
      className="hidden h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex"
    >
      <div className="flex h-14 items-center px-4">
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
          {section.navTitle}
        </p>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 pb-4">
        {section.groups.map((group) => (
          <NavGroupBlock key={group.label} group={group} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}
