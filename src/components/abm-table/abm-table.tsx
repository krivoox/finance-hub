"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

import { SurfaceSection } from "@/components/surface-section";
import { TableHead, TableCell } from "@/components/ui/table";
import { formatSignedMoney } from "@/lib/format-money";
import { cn } from "@/lib/utils";

export const ABM_HEAD_CLASS = "h-10 px-3 sm:px-4";
export const ABM_CELL_CLASS = "px-3 py-3 sm:px-4 sm:py-3.5";

/**
 * Stretch-link overlay class. The containing `relative` must be the `<td>`
 * (`slot="identity"`), not the `<tr>` — see SLOT_CELL_CLASS.
 */
export const ABM_STRETCH_LINK_CLASS =
  "after:absolute after:inset-0 hover:underline";

/** Extra hit target over the amount cell so the whole visible row opens. */
export function AbmRowHitLink({ href }: { href: string }) {
  return (
    <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0" />
  );
}

/** Mobile-first column roles: identity + amount stay visible; actions hide below sm. */
export type AbmColumnSlot = "identity" | "amount" | "action";

const SLOT_HEAD_CLASS: Record<AbmColumnSlot, string> = {
  identity: "min-w-0 w-[62%] sm:w-auto",
  amount: "w-[38%] text-right whitespace-nowrap sm:w-[1%]",
  action: "hidden whitespace-nowrap text-right sm:table-cell sm:w-[1%]",
};

/**
 * `relative` lives on the cell, never the `<tr>`. WebKit ignores
 * `position: relative` on table-row, so stretch-links (`after:inset-0`)
 * would all overlay the table container and steal taps (first/last row).
 */
const SLOT_CELL_CLASS: Record<AbmColumnSlot, string> = {
  identity:
    "relative min-w-0 w-[62%] max-w-[62%] whitespace-normal sm:w-auto sm:max-w-none",
  amount:
    "relative w-[38%] max-w-[38%] text-right whitespace-nowrap sm:w-[1%] sm:max-w-none",
  action:
    "relative z-10 hidden whitespace-nowrap text-right sm:table-cell sm:w-[1%]",
};

type AbmTableProps = {
  children: ReactNode;
  /** Bulk bar rendered above the card (typically `BulkActionsBar`). */
  bulk?: ReactNode;
  className?: string;
};

/**
 * Ledger ABM table chrome: optional bulk bar + one flush SurfaceSection.
 * Features own columns, selection, and row actions.
 */
export function AbmTable({ children, bulk, className }: AbmTableProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {bulk}
      <SurfaceSection flush>{children}</SurfaceSection>
    </div>
  );
}

export function AbmHead({
  className,
  hideBelow,
  slot,
  ...props
}: ComponentProps<typeof TableHead> & {
  hideBelow?: "sm" | "md" | "lg";
  slot?: AbmColumnSlot;
}) {
  return (
    <TableHead
      className={cn(
        ABM_HEAD_CLASS,
        slot && SLOT_HEAD_CLASS[slot],
        hideBelow === "sm" && "hidden sm:table-cell",
        hideBelow === "md" && "hidden md:table-cell",
        hideBelow === "lg" && "hidden lg:table-cell",
        className,
      )}
      {...props}
    />
  );
}

export function AbmCell({
  className,
  hideBelow,
  muted,
  slot,
  ...props
}: ComponentProps<typeof TableCell> & {
  hideBelow?: "sm" | "md" | "lg";
  muted?: boolean;
  slot?: AbmColumnSlot;
}) {
  return (
    <TableCell
      className={cn(
        ABM_CELL_CLASS,
        slot && SLOT_CELL_CLASS[slot],
        hideBelow === "sm" && "hidden sm:table-cell",
        hideBelow === "md" && "hidden md:table-cell",
        hideBelow === "lg" && "hidden lg:table-cell",
        muted && "text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function AbmGlyph({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-sm sm:size-8 sm:text-base",
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

const MONEY_TONE = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-transfer",
} as const;

export function AbmMoney({
  cents,
  currency,
  tone,
  className,
}: {
  cents: number;
  currency: string;
  tone: keyof typeof MONEY_TONE;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-heading text-xs font-extrabold tabular sm:text-sm",
        MONEY_TONE[tone],
        className,
      )}
    >
      {formatSignedMoney(cents, currency)}
    </span>
  );
}
