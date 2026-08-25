"use client";

import type { ReactNode } from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMdUp } from "@/hooks/use-mobile";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

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

function scrollFocusedFieldIntoView(event: React.FocusEvent<HTMLDivElement>) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.matches("input, textarea, select, [contenteditable='true']")) {
    return;
  }
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

/**
 * Create/edit overlay.
 *
 * Mobile: bottom sheet (~92dvh, rounded top). Keyboard lifts the sheet
 * (`visualViewport`) and the body scrolls so focused fields stay visible.
 * Desktop (`md+`): right drawer, unchanged.
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
  const isMdUp = useIsMdUp();
  const keyboardInset = useKeyboardInset();
  const side = isMdUp ? "right" : "bottom";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        side={side}
        showCloseButton={false}
        style={
          isMdUp
            ? undefined
            : {
                bottom: keyboardInset,
                height: `min(92dvh, calc(100dvh - ${keyboardInset}px))`,
                maxHeight: `min(92dvh, calc(100dvh - ${keyboardInset}px))`,
              }
        }
        className={cn(
          "z-[60] gap-0 overflow-hidden p-0",
          isMdUp
            ? [
                "h-dvh max-h-dvh w-full data-[side=right]:h-dvh data-[side=right]:max-h-dvh data-[side=right]:w-full",
                "data-[side=right]:border-l-0 sm:data-[side=right]:border-l",
                "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
                size === "md" && "sm:max-w-md data-[side=right]:sm:max-w-md",
                size === "lg" && "sm:max-w-lg data-[side=right]:sm:max-w-lg",
              ]
            : [
                "rounded-t-2xl border-t data-[side=bottom]:rounded-t-2xl",
                "data-[side=bottom]:inset-x-0 data-[side=bottom]:border-t",
                "pb-[env(safe-area-inset-bottom)]",
              ],
          className,
        )}
      >
        <SheetHeader className="shrink-0 flex-row items-start gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1 space-y-1">
            <SheetTitle className="text-base font-semibold tracking-tight text-balance">
              {title}
            </SheetTitle>
            {description ? (
              <SheetDescription className="text-pretty">
                {description}
              </SheetDescription>
            ) : null}
          </div>
          <SheetClose asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-full sm:size-8"
            >
              <XIcon className="size-4" strokeWidth={1.75} />
              <span className="sr-only">Cerrar</span>
            </Button>
          </SheetClose>
        </SheetHeader>
        <div
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4 pb-8 sm:px-5 sm:py-5 sm:pb-6"
          onFocusCapture={scrollFocusedFieldIntoView}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
