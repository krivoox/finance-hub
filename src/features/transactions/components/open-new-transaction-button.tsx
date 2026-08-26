"use client";

import type { ComponentProps } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formOptionsIntentPrefetchHandlers } from "../stores/new-transaction-form-options-store";
import { useNewTransactionSheetStore } from "../stores/new-transaction-sheet-store";

type OpenNewTransactionButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onClick" | "asChild"
> & {
  /** Visible label (hidden via `sr-only` / parent classes when collapsed). */
  label?: string;
  showIcon?: boolean;
};

/**
 * Opens the global new-transaction FormSheet without navigating.
 */
export function OpenNewTransactionButton({
  label = "Registrar",
  showIcon = true,
  className,
  children,
  ...props
}: OpenNewTransactionButtonProps) {
  const openSheet = useNewTransactionSheetStore((s) => s.openSheet);

  return (
    <Button
      type="button"
      className={cn(className)}
      {...props}
      onClick={() => openSheet()}
      {...formOptionsIntentPrefetchHandlers()}
    >
      {children ?? (
        <>
          {showIcon ? (
            <Plus className="size-4" strokeWidth={1.75} />
          ) : null}
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}
