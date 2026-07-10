import { cn } from "@/lib/utils";

type ContentPanelProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

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
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-card md:rounded-xl md:border md:border-border md:shadow-sm",
        className
      )}
    >
      <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:py-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
        {children}
      </div>
    </section>
  );
}
