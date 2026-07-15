import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  PiggyBank,
  Receipt,
  Settings,
  Target,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Runtime badge counts from domain signals (omit or 0 = no badge). */
export type NavBadges = {
  /** Budgets in warning or exceeded status (SPEC-12). */
  budgetsAtRisk?: number;
};

/** Primary links under the quick-create row */
export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Cuentas", href: "/accounts", icon: Wallet },
  { title: "Movimientos", href: "/transactions", icon: Receipt },
];

/** Grouped sections (like Documents in the reference) */
export const navGroups: NavGroup[] = [
  {
    label: "Planificación",
    items: [
      { title: "Presupuestos", href: "/budgets", icon: PiggyBank },
      { title: "Objetivos", href: "/goals", icon: Target },
    ],
  },
  {
    label: "Compartido",
    items: [{ title: "Grupos", href: "/groups", icon: Users }],
  },
];

export const footerNavItems: NavItem[] = [
  { title: "Ajustes", href: "/settings", icon: Settings },
];

/** Merge live badge counts into static nav items for rendering. */
export function applyNavBadges(
  items: readonly NavItem[],
  badges: NavBadges,
): NavItem[] {
  return items.map((item) => {
    if (item.href === "/budgets") {
      const count = badges.budgetsAtRisk ?? 0;
      return count > 0 ? { ...item, badge: count } : { ...item, badge: undefined };
    }
    return item;
  });
}

export function isNavItemActive(pathname: string, href: string): boolean {
  const [path] = href.split("?");
  if (pathname === path) return true;
  if (path !== "/" && pathname.startsWith(`${path}/`)) return true;
  return false;
}

export function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/groups/settings")) return "Grupos";
  const all = [
    ...mainNavItems,
    ...navGroups.flatMap((g) => g.items),
    ...footerNavItems,
  ];
  const match = all.find((item) => isNavItemActive(pathname, item.href));
  return match?.title ?? "Finance Hub";
}
