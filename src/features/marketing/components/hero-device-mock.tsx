import { cn } from "@/lib/utils";

/**
 * Hero signature: phone frame + floating metric cards (ref layout),
 * content = hogar / ARS+USD (our product), tokens only.
 */
export function HeroDeviceMock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/5] w-full max-w-[22rem] px-2 sm:max-w-[26rem] sm:px-0",
        className,
      )}
    >
      {/* Ambient glow bloom (HyperFrames-inspired) */}
      <div
        aria-hidden
        className="fh-glow-breathe pointer-events-none absolute top-1/2 left-1/2 size-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--info-muted)_0%,transparent_68%)] opacity-50 dark:opacity-30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[10%] right-0 size-40 rounded-full bg-[radial-gradient(circle,var(--success-muted)_0%,transparent_70%)] opacity-60 blur-2xl dark:opacity-25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[15%] left-0 size-36 rounded-full bg-[radial-gradient(circle,var(--warning-muted)_0%,transparent_70%)] opacity-50 blur-2xl dark:opacity-20"
      />

      {/* Phone */}
      <div className="absolute inset-x-[18%] inset-y-[6%] z-10 flex flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-md sm:rounded-[2.25rem]">
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="h-1.5 w-16 rounded-full bg-muted-foreground/25" />
        </div>
        <div className="flex flex-1 flex-col gap-3 px-3.5 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Hogar
            </p>
            <p className="text-xs text-muted-foreground">Patrimonio estimado</p>
            <p className="fh-display text-2xl font-semibold tracking-tight tabular-nums">
              ≈ $ 2.214.550
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="ARS" value="$ 934.550" tone="info" />
            <MiniStat label="USD" value="U$S 1.420" tone="success" />
          </div>

          <div className="mt-auto space-y-2 rounded-xl border border-border bg-muted/40 p-2.5">
            <p className="text-[10px] font-medium text-muted-foreground">
              Este mes
            </p>
            <div className="flex h-16 items-end gap-1 px-0.5">
              {[40, 55, 35, 70, 48, 62, 45].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-info/70"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating cards */}
      <FloatCard
        className="fh-float-a absolute top-[8%] -left-1 z-20 w-[9.5rem] sm:-left-4 sm:w-44"
        label="Gastos del mes"
        value="$ 186.420"
        hint="ARS"
        tone="expense"
      />
      <FloatCard
        className="fh-float-b absolute top-[28%] -right-2 z-20 w-[9.5rem] sm:-right-5 sm:w-44"
        label="Disponible"
        value="$ 412.100"
        hint="después de presupuestos"
        tone="income"
      />
      <FloatCard
        className="fh-float-a absolute bottom-[14%] -left-2 z-20 w-[10.5rem] sm:-left-6 sm:w-48"
        label="Balance pareja"
        value="Queda $ 12.400"
        hint="después del split"
        tone="transfer"
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "info" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 p-2.5",
        tone === "info" ? "bg-info-muted/60" : "bg-success-muted/60",
      )}
    >
      <p className="font-mono text-[10px] font-medium text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function FloatCard({
  className,
  label,
  value,
  hint,
  tone,
}: {
  className?: string;
  label: string;
  value: string;
  hint: string;
  tone: "expense" | "income" | "transfer";
}) {
  const bar =
    tone === "expense"
      ? "bg-expense"
      : tone === "income"
        ? "bg-income"
        : "bg-transfer";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", bar)} />
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-sm font-semibold tabular-nums text-foreground">
            {value}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{hint}</p>
        </div>
      </div>
    </div>
  );
}
