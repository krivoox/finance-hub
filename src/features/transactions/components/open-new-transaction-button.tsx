"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { CoreTransactionType } from "./transaction-type-theme";

type OpenNewTransactionButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onClick" | "asChild" | "type"
> & {
  /** Visible label (hidden via `sr-only` / parent classes when collapsed). */
  label?: string;
  showIcon?: boolean;
  /** Pre-selects the movement type on the core screen. */
  type?: CoreTransactionType;
  /** Override the destination (defaults to the core screen with `type`). */
  href?: string;
};

/**
 * SPEC-23 — Entry point to the core transaction screen. Navigates to `/new`
 * (dedicated route) instead of opening the legacy global FormSheet.
 */
export function OpenNewTransactionButton({
  label = "Registrar",
  showIcon = true,
  type = "expense",
  href,
  className,
  children,
  ...props
}: OpenNewTransactionButtonProps) {
  const target = href ?? `/new?type=${type}`;

  return (
    <Button asChild className={cn(className)} {...props}>
      <Link href={target}>
        {children ?? (
          <>
            {showIcon ? (
              <Plus className="size-4" strokeWidth={1.75} />
            ) : null}
            <span>{label}</span>
          </>
        )}
      </Link>
    </Button>
  );
}
