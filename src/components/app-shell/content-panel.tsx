import { cn } from "@/lib/utils";

type ContentPanelProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Page chrome shared by all (app) routes.
 * Aligned with landing surfaces: softer radius, calm header hierarchy.
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
        "flex flex-1 flex-col bg-card md:min-h-0 md:overflow-hidden md:rounded-2xl md:border md:border-border md:shadow-sm",
        /* Dark: float the panel above charcoal canvas — no hairline, soft depth */
        "dark:md:border-transparent dark:md:shadow-[0_8px_30px_oklch(0_0_0/0.45)]",
        className,
      )}
    >
      <header className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto [&_a]:rounded-full [&_button]:rounded-full">
            {actions}
          </div>
        ) : null}
      </header>
      {/*
        Mobile: grow with content — page scrolls.
        md+: constrained panel with internal overflow-y-auto.
      */}
      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 md:min-h-0 md:overflow-y-auto md:overscroll-contain lg:px-8 lg:py-6">
        {children}
      </div>
    </section>
  );
}
