"use client";

import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type FormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** md ≈ 28rem, lg ≈ 32rem — formularios densos (movimientos) usan lg. */
  size?: "md" | "lg";
  trigger?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Create/edit overlay: full-bleed from the right on mobile, fixed-width
 * drawer on desktop. Prefer this over a centered modal for multi-field forms.
 *
 * Scroll contract (mobile): Sheet is viewport-capped (`h-dvh` + overflow-hidden);
 * only the body scrolls. Without that, flex-1 grows with form content and
 * División / footer stay unreachable.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  trigger,
  children,
  className,
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        side="right"
        showCloseButton
        className={cn(
          // Override Sheet defaults (`data-[side=right]:h-full`) so the panel
          // stays viewport-capped on mobile and the body can scroll.
          "w-full gap-0 overflow-hidden p-0",
          "h-dvh max-h-dvh data-[side=right]:h-dvh data-[side=right]:max-h-dvh",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          size === "md" && "sm:max-w-md",
          size === "lg" && "sm:max-w-lg",
          className,
        )}
      >
        <SheetHeader className="shrink-0 gap-1 border-b border-border px-4 py-4 pr-12 sm:px-5">
          <SheetTitle className="text-base font-semibold tracking-tight text-balance">
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="text-pretty">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4 pb-8 sm:px-5 sm:py-5 sm:pb-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
