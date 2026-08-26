import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SplitLedgerRow({
  href,
  leading,
  title,
  caption,
  trailing,
  className,
}: {
  href?: string;
  leading?: ReactNode;
  title: string;
  caption?: string;
  trailing: ReactNode;
  className?: string;
}) {
  const inner = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {caption ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {caption}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 max-w-[42%] shrink-0 text-right">{trailing}</div>
    </>
  );

  const rowClass = cn(
    "flex min-w-0 items-center gap-3 py-2.5",
    href
      ? "rounded-xl px-2 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
      : "first:pt-0 last:pb-0",
    className,
  );

  if (href) {
    return (
      <Link href={href} aria-label={`Abrir ${title}`} className={rowClass}>
        {inner}
      </Link>
    );
  }

  return <div className={rowClass}>{inner}</div>;
}
