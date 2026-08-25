import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
};

/** Single-column field block: label → control → hint/error. */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-1.5 text-sm font-medium text-muted-foreground"
      >
        <span>{label}</span>
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground">
            opcional
          </span>
        ) : null}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && hint ? (
        <p className="text-xs text-muted-foreground text-pretty">{hint}</p>
      ) : null}
    </div>
  );
}

type FormSectionProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/** Groups related fields; first section usually has no title. */
export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {title ? (
        <header className="space-y-0.5">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {title}
          </h3>
          {description ? (
            <p className="text-xs text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

type FormStackProps = {
  children: ReactNode;
  className?: string;
};

export function FormStack({ children, className }: FormStackProps) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>{children}</div>
  );
}

type FormActionsProps = {
  children: ReactNode;
  className?: string;
};

/** Sticky-feeling actions: full-width primary on mobile. */
export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border bg-popover pt-4 sm:static sm:flex-row sm:justify-end sm:bg-transparent",
        "sticky bottom-0 z-10 -mx-4 mt-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:mx-0 sm:mt-0 sm:px-0 sm:py-0 sm:pb-0 sm:pt-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
