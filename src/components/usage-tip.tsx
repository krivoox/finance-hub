"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dismissTip, isTipDismissed } from "@/lib/tips-storage";
import { cn } from "@/lib/utils";

type UsageTipProps = {
  tipId: string;
  title: string;
  body: string;
  dismissLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

/**
 * Contextual “ledger margin note”: short copy + optional CTA + dismiss.
 * Visibility is hydrated client-side from versioned localStorage.
 */
export function UsageTip({
  tipId,
  title,
  body,
  dismissLabel = "Entendido",
  actionLabel,
  onAction,
  className,
}: UsageTipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isTipDismissed(tipId));
  }, [tipId]);

  if (!visible) return null;

  function handleDismiss() {
    dismissTip(tipId);
    setVisible(false);
  }

  return (
    <aside
      className={cn(
        "rounded-lg border border-border bg-info-muted/60 px-3 py-3 sm:px-4",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
        className,
      )}
      role="note"
      aria-label={title}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-pretty text-muted-foreground">{body}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            {actionLabel && onAction ? (
              <Button
                type="button"
                size="sm"
                
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 text-muted-foreground sm:h-8"
              onClick={handleDismiss}
            >
              {dismissLabel}
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-10 shrink-0 text-muted-foreground sm:size-8"
          aria-label="Cerrar tip"
          onClick={handleDismiss}
        >
          <XIcon className="size-4" strokeWidth={1.75} />
        </Button>
      </div>
    </aside>
  );
}
