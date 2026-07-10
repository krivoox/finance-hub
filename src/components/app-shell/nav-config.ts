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

/** Primary links under the quick-create row */
export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Cuentas", href: "/accounts", icon: Wallet },
  { title: "Movimientos", href: "/transactions", icon: Receipt, badge: 3 },
];

/** Grouped sections (like Documents in the reference) */
export const navGroups: NavGroup[] = [
  {
    label: "Planificación",
    items: [
      { title: "Presupuestos", href: "/budgets", icon: PiggyBank, badge: 1 },
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

// TODO: replace with active workspace from session
export const mockWorkspace = {
  name: "Personal",
  initials: "FH",
};

export function isNavItemActive(pathname: string, href: string): boolean {
  const [path] = href.split("?");
  if (pathname === path) return true;
  if (path !== "/" && pathname.startsWith(`${path}/`)) return true;
  return false;
}

export function getPageTitle(pathname: string): string {
  const all = [
    ...mainNavItems,
    ...navGroups.flatMap((g) => g.items),
    ...footerNavItems,
  ];
  const match = all.find((item) => isNavItemActive(pathname, item.href));
  return match?.title ?? "Finance Hub";
}
