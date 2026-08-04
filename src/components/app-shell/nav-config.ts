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

export type NavBadgeSeverity = "caution" | "critical";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  /** Visual severity for the badge (red icon only when critical). */
  badgeSeverity?: NavBadgeSeverity;
  /** Accessible label; must not rely on color alone. */
  badgeAriaLabel?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Runtime badge counts from domain signals (omit or 0 = no badge). */
export type NavBadges = {
  /** Budgets in warning or exceeded status (SPEC-07 / SPEC-12). */
  budgetsAtRisk?: number;
  /** Budgets in exceeded status only (subset of at-risk). */
  budgetsExceeded?: number;
};

export type BudgetNavBadgePresentation = {
  count: number;
  severity: NavBadgeSeverity;
  ariaLabel: string;
};

/**
 * Derive sidebar badge presentation from budget nav counts.
 * Number = total at-risk; critical icon only when exceeded ≥ 1.
 */
export function budgetNavBadgePresentation(
  badges: NavBadges,
): BudgetNavBadgePresentation | null {
  const atRisk = badges.budgetsAtRisk ?? 0;
  if (atRisk <= 0) return null;

  const exceeded = badges.budgetsExceeded ?? 0;
  if (exceeded > 0) {
    return {
      count: atRisk,
      severity: "critical",
      ariaLabel: `Presupuestos: ${atRisk} necesitan atención; hay presupuestos excedidos`,
    };
  }

  return {
    count: atRisk,
    severity: "caution",
    ariaLabel: `Presupuestos: ${atRisk} al límite o cerca del límite`,
  };
}

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
    if (item.href !== "/budgets") {
      return item;
    }

    const presentation = budgetNavBadgePresentation(badges);
    if (!presentation) {
      return {
        ...item,
        badge: undefined,
        badgeSeverity: undefined,
        badgeAriaLabel: undefined,
      };
    }

    return {
      ...item,
      badge: presentation.count,
      badgeSeverity: presentation.severity,
      badgeAriaLabel: presentation.ariaLabel,
    };
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
  if (pathname.startsWith("/budgets/") && pathname !== "/budgets") {
    return "Presupuesto";
  }
  if (pathname.startsWith("/transactions/") && pathname !== "/transactions") {
    return "Movimiento";
  }
  const all = [
    ...mainNavItems,
    ...navGroups.flatMap((g) => g.items),
    ...footerNavItems,
  ];
  const match = all.find((item) => isNavItemActive(pathname, item.href));
  return match?.title ?? "Finance Hub";
}
