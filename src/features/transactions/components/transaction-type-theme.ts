import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Scale,
  type LucideIcon,
} from "lucide-react";

/**
 * SPEC-23 — Visual identity of each movement type on the core screen.
 * Colors use the semantic tokens from `globals.css` (no raw palette names).
 */
export type CoreTransactionType = "expense" | "income" | "transfer" | "adjustment";

export type CoreTypeTheme = {
  readonly value: CoreTransactionType;
  readonly label: string;
  /** Sign shown next to the amount / in the feedback chip. */
  readonly sign: string;
  readonly icon: LucideIcon;
  /** Active segmented-tab classes. */
  readonly tabActive: string;
  /** Accent text (amount, balance). */
  readonly text: string;
  /** Accent border for selected cards. */
  readonly border: string;
  /** Soft accent background. */
  readonly soft: string;
  /** Ring accent for focused/selected elements. */
  readonly ring: string;
};

export const CORE_TYPE_THEME: Record<CoreTransactionType, CoreTypeTheme> = {
  expense: {
    value: "expense",
    label: "Gasto",
    sign: "−",
    icon: ArrowUpRight,
    tabActive: "border-expense bg-expense-muted text-expense",
    text: "text-expense",
    border: "border-expense",
    soft: "bg-expense-muted",
    ring: "ring-expense",
  },
  income: {
    value: "income",
    label: "Ingreso",
    sign: "+",
    icon: ArrowDownLeft,
    tabActive: "border-income bg-income-muted text-income",
    text: "text-income",
    border: "border-income",
    soft: "bg-income-muted",
    ring: "ring-income",
  },
  transfer: {
    value: "transfer",
    label: "Transferencia",
    sign: "↔",
    icon: ArrowLeftRight,
    tabActive: "border-transfer bg-transfer-muted text-transfer",
    text: "text-transfer",
    border: "border-transfer",
    soft: "bg-transfer-muted",
    ring: "ring-transfer",
  },
  adjustment: {
    value: "adjustment",
    label: "Ajuste",
    sign: "±",
    icon: Scale,
    tabActive: "border-warning bg-warning-muted text-warning",
    text: "text-warning",
    border: "border-warning",
    soft: "bg-warning-muted",
    ring: "ring-warning",
  },
};

export const CORE_TYPE_ORDER: readonly CoreTransactionType[] = [
  "expense",
  "income",
  "transfer",
  "adjustment",
];
