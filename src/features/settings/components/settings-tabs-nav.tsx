import Link from "next/link";

import { cn } from "@/lib/utils";

export const SETTINGS_TABS = [
  {
    id: "perfil" as const,
    label: "Perfil",
    description: "Nombre, moneda y zona horaria",
  },
  {
    id: "workspace" as const,
    label: "Workspace",
    description: "Crear espacios grupales",
  },
  {
    id: "categorias" as const,
    label: "Categorías",
    description: "Clasificación de ingresos y gastos",
  },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export function parseSettingsTab(raw: string | undefined): SettingsTabId {
  if (raw === "workspace" || raw === "categorias" || raw === "perfil") {
    return raw;
  }
  return "perfil";
}

export function SettingsTabsNav({ active }: { active: SettingsTabId }) {
  return (
    <nav
      aria-label="Secciones de ajustes"
      className="-mx-1 mb-8 flex gap-4 overflow-x-auto border-b border-border px-1 sm:gap-6"
    >
      {SETTINGS_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={`/settings?tab=${tab.id}`}
            scroll={false}
            className={cn(
              "relative -mb-px shrink-0 pb-3 text-sm transition-colors",
              isActive
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="block">{tab.label}</span>
            <span className="mt-0.5 hidden text-xs font-normal text-muted-foreground sm:block">
              {tab.description}
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
