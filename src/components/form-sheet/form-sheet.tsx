"use client";

import { useEffect, type ReactNode } from "react";

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
import { MD_MIN_WIDTH_PX } from "@/lib/breakpoints";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

type FormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** md ≈ 28rem, lg ≈ 32rem — formularios densos (movimientos) usan lg. */
  size?: "md" | "lg";
  /**
   * `scroll` (default): the sheet body scrolls as a whole.
   * `fill`: children own scrolling so a footer (`FormActions sticky`) can pin
   * to the bottom edge while fields scroll above it.
   */
  layout?: "scroll" | "fill";
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
 * iOS still pans the document behind a bottom sheet unless the body is pinned.
 * Desktop drawers keep document flow so the list remains visible beside the
 * panel. App shell forbids overflow-hidden on idle mobile scroll; this lock
 * is only while the overlay is open.
 */
function useLockBackgroundScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const html = document.documentElement;
    const { body } = document;
    const scrollY = window.scrollY;
    const pinBody = window.matchMedia(
      `(max-width: ${MD_MIN_WIDTH_PX - 1}px)`,
    ).matches;

    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    if (pinBody) {
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      if (pinBody) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [locked]);
}

/**
 * Scrollable region inside a `layout="fill"` sheet. Pair with sticky
 * `FormActions` so the primary CTA stays on the bottom edge.
 */
export function FormSheetBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5 sm:py-5",
        className,
      )}
      onFocusCapture={scrollFocusedFieldIntoView}
    >
      {children}
    </div>
  );
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
  layout = "scroll",
  trigger,
  children,
  className,
}: FormSheetProps) {
  const isMdUp = useIsMdUp();
  const keyboardInset = useKeyboardInset();
  const side = isMdUp ? "right" : "bottom";

  useLockBackgroundScroll(open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal>
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
          "z-[60] gap-0 overflow-hidden overscroll-none p-0",
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
        {layout === "fill" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        ) : (
          <div
            className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4 pb-8 sm:px-5 sm:py-5 sm:pb-6"
            onFocusCapture={scrollFocusedFieldIntoView}
          >
            {children}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
