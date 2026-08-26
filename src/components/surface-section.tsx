import { cn } from "@/lib/utils";

type SurfaceSectionProps = {
  children: React.ReactNode;
  className?: string;
  /** Softer muted fill (rare — prefer the default white card) */
  muted?: boolean;
  /** Remove padding — for tables flush to edges */
  flush?: boolean;
} & React.ComponentProps<"div">;

/**
 * Product card on the slate canvas: white, 16px radius, hairline + soft shadow.
 */
export function SurfaceSection({
  children,
  className,
  muted = false,
  flush = false,
  ...props
}: SurfaceSectionProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0 max-w-full rounded-2xl border border-border shadow-card",
        muted ? "bg-muted/60" : "bg-card",
        flush ? "overflow-hidden" : "p-5 md:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type SurfaceHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function SurfaceHeader({
  title,
  description,
  action,
  className,
}: SurfaceHeaderProps) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="font-heading text-sm font-extrabold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex min-h-10 shrink-0 items-center sm:min-h-0">
          {action}
        </div>
      ) : null}
    </div>
  );
}
