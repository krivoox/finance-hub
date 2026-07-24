import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** Soft pastel feature card — uses semantic muted tokens (ref: 3-up grid). */
export function PastelFeatureCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "info" | "warning" | "success";
}) {
  const bg =
    tone === "info"
      ? "bg-info-muted/70"
      : tone === "warning"
        ? "bg-warning-muted/70"
        : "bg-success-muted/70";

  return (
    <article
      className={cn(
        "group relative flex min-h-[11rem] flex-col rounded-3xl p-6 transition-transform duration-200 ease-out hover:-translate-y-0.5",
        bg,
      )}
    >
      <span
        aria-hidden
        className="absolute top-5 right-5 text-muted-foreground/70 transition-colors group-hover:text-foreground"
      >
        ↗
      </span>
      <h3 className="pr-8 fh-display text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
        {body}
      </p>
    </article>
  );
}

export function FeatureCheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm text-foreground">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" strokeWidth={2.5} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Left panel mock: shared workspace / integrations-style card */
export function SharedHomeMock() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-muted/50 p-6 sm:p-8">
      <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">
          Espacio compartido
        </p>
        <p className="mt-1 fh-display text-xl font-semibold tracking-tight">
          Casa
        </p>
        <p className="mt-4 text-xs text-muted-foreground">Balance del grupo</p>
        <p className="text-2xl font-semibold tabular-nums">$ 0</p>
        <p className="mt-1 text-xs text-success">Todo saldado este mes</p>
        <div className="mt-5 flex gap-2">
          {["Vos", "Ana", "Lucas"].map((name) => (
            <div
              key={name}
              className="flex flex-1 flex-col items-center gap-1.5 rounded-xl bg-muted/80 py-2"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-info-muted text-xs font-semibold text-info-muted-foreground">
                {name.slice(0, 1)}
              </span>
              <span className="text-[10px] text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Right panel mock: charts / clarity */
export function ClarityChartsMock() {
  return (
    <div className="relative min-h-[16rem] sm:min-h-[18rem]">
      <div className="fh-float-b absolute top-0 right-0 w-[55%] rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[10px] font-medium text-muted-foreground">
          Gasto por categoría
        </p>
        <div className="mt-3 flex h-24 items-end gap-1.5">
          {[65, 40, 80, 35, 55, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-md bg-info/60"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      <div className="fh-float-a absolute bottom-2 left-0 w-[48%] rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[10px] font-medium text-muted-foreground">
          Presupuesto comida
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums">68%</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[68%] rounded-full bg-info" />
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          On track · quedan 9 días
        </p>
      </div>
      <div className="absolute top-1/3 left-[35%] flex size-28 items-center justify-center rounded-full border border-border bg-card shadow-sm">
        <div
          className="size-20 rounded-full"
          style={{
            background:
              "conic-gradient(var(--income) 0 42%, var(--expense) 42% 78%, var(--muted) 78% 100%)",
          }}
        />
      </div>
    </div>
  );
}

/** Geometric spiral for dark CTA — HyperFrames-style decorative motion */
export function SpiralMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn("fh-spiral-spin text-primary-foreground/25", className)}
      aria-hidden
    >
      <path
        d="M100 100m-8 0a8 8 0 1 1 16 0a8 8 0 1 1 -16 0 M100 100m-22 0a22 22 0 1 1 44 0a22 22 0 1 1 -44 0 M100 100m-36 0a36 36 0 1 1 72 0a36 36 0 1 1 -72 0 M100 100m-50 0a50 50 0 1 1 100 0a50 50 0 1 1 -100 0 M100 100m-64 0a64 64 0 1 1 128 0a64 64 0 1 1 -128 0 M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1 -156 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}
