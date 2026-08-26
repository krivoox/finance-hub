"use client";

import { cn } from "@/lib/utils";

type NavGlyphProps = {
  children: string;
  className?: string;
};

/**
 * Colorful emoji glyph for nav destinations (Figma Make ledger navy).
 * Decorative only — the adjacent label / aria-label names the destination.
 */
export function NavGlyph({ children, className }: NavGlyphProps) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center text-base leading-none select-none",
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}
