import Link from "next/link";

import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    href: "/groups",
    id: "activity" as const,
    label: "Actividad",
    description: "Balances y actividad",
  },
  {
    href: "/groups/settings",
    id: "settings" as const,
    label: "Administración",
    description: "Miembros e invitaciones",
  },
];

export function GroupsSectionNav({
  active,
}: {
  active: "activity" | "settings";
}) {
  return (
    <nav
      aria-label="Secciones del grupo"
      className="-mx-1 mb-8 flex gap-4 overflow-x-auto border-b border-border px-1 sm:gap-6"
    >
      {SECTIONS.map((section) => {
        const isActive = section.id === active;
        return (
          <Link
            key={section.id}
            href={section.href}
            className={cn(
              "relative -mb-px shrink-0 pb-3 text-sm transition-colors",
              isActive
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="block">{section.label}</span>
            <span className="mt-0.5 hidden text-xs font-normal text-muted-foreground sm:block">
              {section.description}
            </span>
            {isActive ? (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
