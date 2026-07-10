import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  CreditCard,
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
  icon?: LucideIcon;
  badge?: number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type RailSection = {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  /** Path prefixes that keep this rail section active */
  match: string[];
  navTitle: string;
  groups: NavGroup[];
};

export const railSections: RailSection[] = [
  {
    id: "home",
    title: "Inicio",
    href: "/dashboard",
    icon: LayoutDashboard,
    match: ["/dashboard"],
    navTitle: "Inicio",
    groups: [
      {
        label: "Resumen",
        items: [
          { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ],
      },
    ],
  },
  {
    id: "accounts",
    title: "Cuentas",
    href: "/accounts",
    icon: Wallet,
    match: ["/accounts"],
    navTitle: "Cuentas",
    groups: [
      {
        label: "Cuentas",
        items: [
          { title: "Todas", href: "/accounts", icon: Wallet },
          { title: "Tarjetas", href: "/accounts?type=credit", icon: CreditCard },
        ],
      },
    ],
  },
  {
    id: "transactions",
    title: "Movimientos",
    href: "/transactions",
    icon: Receipt,
    match: ["/transactions"],
    navTitle: "Movimientos",
    groups: [
      {
        label: "Movimientos",
        items: [
          { title: "Todos", href: "/transactions", icon: Receipt, badge: 3 },
          {
            title: "Transferencias",
            href: "/transactions?type=transfer",
            icon: ArrowLeftRight,
          },
        ],
      },
    ],
  },
  {
    id: "budgets",
    title: "Presupuestos",
    href: "/budgets",
    icon: PiggyBank,
    match: ["/budgets"],
    navTitle: "Presupuestos",
    groups: [
      {
        label: "Presupuestos",
        items: [
          { title: "Este mes", href: "/budgets", icon: PiggyBank, badge: 1 },
        ],
      },
    ],
  },
  {
    id: "goals",
    title: "Objetivos",
    href: "/goals",
    icon: Target,
    match: ["/goals"],
    navTitle: "Objetivos",
    groups: [
      {
        label: "Objetivos",
        items: [{ title: "Activos", href: "/goals", icon: Target }],
      },
    ],
  },
  {
    id: "groups",
    title: "Grupos",
    href: "/groups",
    icon: Users,
    match: ["/groups"],
    navTitle: "Grupos",
    groups: [
      {
        label: "Compartido",
        items: [{ title: "Hogar", href: "/groups", icon: Users }],
      },
    ],
  },
];

export const railFooterItems: NavItem[] = [
  { title: "Ajustes", href: "/settings", icon: Settings },
];

export const settingsSection: RailSection = {
  id: "settings",
  title: "Ajustes",
  href: "/settings",
  icon: Settings,
  match: ["/settings"],
  navTitle: "Ajustes",
  groups: [
    {
      label: "Cuenta",
      items: [
        { title: "General", href: "/settings", icon: Settings },
      ],
    },
  ],
};

export function getActiveRailSection(pathname: string): RailSection {
  if (
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  ) {
    return settingsSection;
  }

  const found = railSections.find((section) =>
    section.match.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  );
  return found ?? railSections[0];
}

export function isNavItemActive(pathname: string, href: string): boolean {
  const [path] = href.split("?");
  if (pathname === path) return true;
  if (path !== "/" && pathname.startsWith(`${path}/`)) return true;
  return false;
}
