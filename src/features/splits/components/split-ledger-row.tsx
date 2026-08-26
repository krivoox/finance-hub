import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SplitLedgerRow({
  href,
  leading,
  title,
  caption,
  trailing,
  menu,
  className,
}: {
  href?: string;
  leading?: ReactNode;
  title: string;
  caption?: string;
  trailing: ReactNode;
  menu?: ReactNode;
  className?: string;
}) {
  const body = (
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
      <div
        className={cn(
          "min-w-0 shrink-0 text-right",
          menu ? "max-w-[34%]" : "max-w-[42%]",
        )}
      >
        {trailing}
      </div>
    </>
  );

  const padded = Boolean(href || menu);
  const rowClass = cn(
    "flex min-w-0 items-center py-2.5",
    padded ? "rounded-xl" : "first:pt-0 last:pb-0",
    className,
  );

  if (href) {
    return (
      <div className={cn(rowClass, "gap-0.5")}>
        <Link
          href={href}
          aria-label={`Abrir ${title}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-0.5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
        >
          {body}
        </Link>
        {menu ? <div className="shrink-0 pr-0.5">{menu}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn(rowClass, "gap-3", padded && "px-2")}>
      {body}
      {menu ? <div className="shrink-0">{menu}</div> : null}
    </div>
  );
}
