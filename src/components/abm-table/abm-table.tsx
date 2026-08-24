"use client";

import type { ComponentProps, ReactNode } from "react";

import { SurfaceSection } from "@/components/surface-section";
import { TableHead, TableCell } from "@/components/ui/table";
import { formatSignedMoney } from "@/lib/format-money";
import { cn } from "@/lib/utils";

export const ABM_HEAD_CLASS = "h-10 px-4";
export const ABM_CELL_CLASS = "px-4 py-3.5";

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
  ...props
}: ComponentProps<typeof TableHead> & {
  hideBelow?: "sm" | "md" | "lg";
}) {
  return (
    <TableHead
      className={cn(
        ABM_HEAD_CLASS,
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
  ...props
}: ComponentProps<typeof TableCell> & {
  hideBelow?: "sm" | "md" | "lg";
  muted?: boolean;
}) {
  return (
    <TableCell
      className={cn(
        ABM_CELL_CLASS,
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
        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-base",
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
        "font-heading text-sm font-extrabold tabular",
        MONEY_TONE[tone],
        className,
      )}
    >
      {formatSignedMoney(cents, currency)}
    </span>
  );
}
