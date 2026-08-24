import { cn } from "@/lib/utils";

type ContentPanelProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Page chrome on the slate canvas — title + actions, then children as cards.
 * Not a wrapping card: sections (`SurfaceSection`) own the white surfaces.
 */
export function ContentPanel({
  title,
  description,
  actions,
  children,
  className,
}: ContentPanelProps) {
  return (
    <section
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-[1400px] flex-1 flex-col md:min-h-0 md:overflow-hidden",
        className,
      )}
    >
      <header className="flex shrink-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="min-w-0">
          <h1 className="font-heading text-lg font-extrabold tracking-tight text-foreground text-balance sm:text-xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
            {actions}
          </div>
        ) : null}
      </header>
      <div className="min-w-0 flex-1 overflow-x-hidden px-4 pb-4 sm:px-6 sm:pb-5 md:min-h-0 md:overflow-y-auto md:overscroll-contain lg:px-8 lg:pb-6">
        {children}
      </div>
    </section>
  );
}
